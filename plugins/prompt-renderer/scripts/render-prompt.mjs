#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_BACKGROUND = "#f8f9f6";
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;
const DEFAULT_PADDING = 20;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`알 수 없는 인자: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${key} 값이 필요합니다.`);
    }
    options[key.slice(2)] = value;
    index += 1;
  }

  for (const key of ["input", "date", "output"]) {
    if (!options[key]) throw new Error(`--${key} 인자가 필요합니다.`);
  }

  return {
    input: path.resolve(options.input),
    date: options.date,
    output: path.resolve(options.output),
    width: parsePositiveNumber(options.width, DEFAULT_WIDTH, "width"),
    height: parsePositiveNumber(options.height, DEFAULT_HEIGHT, "height"),
    padding: parseNonNegativeNumber(
      options.padding,
      DEFAULT_PADDING,
      "padding",
    ),
    background: options.background ?? DEFAULT_BACKGROUND,
  };
}

function parsePositiveNumber(value, fallback, name) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`--${name}은(는) 양수여야 합니다.`);
  }
  return number;
}

function parseNonNegativeNumber(value, fallback, name) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`--${name}은(는) 0 이상이어야 합니다.`);
  }
  return number;
}

function loadPrompt(input, date) {
  const prompts = JSON.parse(fs.readFileSync(input, "utf8"));
  if (!Array.isArray(prompts))
    throw new Error("입력 JSON은 배열이어야 합니다.");
  const prompt = prompts.find((item) => item?.date === date);
  if (!prompt) {
    const dates = prompts
      .map((item) => item?.date)
      .filter(Boolean)
      .sort();
    throw new Error(
      `${date} prompt가 없습니다. 등록된 범위: ${dates[0] ?? "없음"} ~ ${dates.at(-1) ?? "없음"}`,
    );
  }
  validateStrokes(prompt.strokes);
  return prompt;
}

function validateStrokes(strokes) {
  if (!Array.isArray(strokes)) throw new Error("strokes는 배열이어야 합니다.");
  strokes.forEach((stroke, index) => {
    const [xPoints, yPoints] = stroke?.points ?? [];
    if (!Array.isArray(xPoints) || !Array.isArray(yPoints)) {
      throw new Error(`stroke[${index}].points 형식이 올바르지 않습니다.`);
    }
    if (xPoints.length !== yPoints.length) {
      throw new Error(`stroke[${index}]의 x/y point 수가 다릅니다.`);
    }
    if (![...xPoints, ...yPoints].every(Number.isFinite)) {
      throw new Error(`stroke[${index}]에 숫자가 아닌 좌표가 있습니다.`);
    }
    if (
      !Array.isArray(stroke.color) ||
      stroke.color.length !== 3 ||
      !stroke.color.every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 255,
      )
    ) {
      throw new Error(`stroke[${index}].color 형식이 올바르지 않습니다.`);
    }
  });
}

function calculateScale(strokes, width, height, padding) {
  const points = strokes.flatMap((stroke) => {
    const [xs, ys] = stroke.points;
    return xs.map((x, index) => ({ x, y: ys[index] }));
  });
  if (points.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 };

  const bounds = points.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const originalWidth = bounds.maxX - bounds.minX;
  const originalHeight = bounds.maxY - bounds.minY;
  if (originalWidth === 0 && originalHeight === 0) {
    return {
      scale: 1,
      offsetX: width / 2 - bounds.minX,
      offsetY: height / 2 - bounds.minY,
    };
  }

  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scaleX =
    originalWidth === 0 ? availableHeight : availableWidth / originalWidth;
  const scaleY =
    originalHeight === 0 ? availableWidth : availableHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY);
  return {
    scale,
    offsetX: (width - originalWidth * scale) / 2 - bounds.minX * scale,
    offsetY: (height - originalHeight * scale) / 2 - bounds.minY * scale,
  };
}

function renderSvg(prompt, options) {
  const scaleInfo = calculateScale(
    prompt.strokes,
    options.width,
    options.height,
    options.padding,
  );
  const transform = (x, y) => ({
    x: x * scaleInfo.scale + scaleInfo.offsetX,
    y: y * scaleInfo.scale + scaleInfo.offsetY,
  });
  const elements = prompt.strokes.map((stroke) => {
    const [xs, ys] = stroke.points;
    const color = `rgb(${stroke.color.join(", ")})`;
    if (xs.length === 0) return "";
    if (xs.length === 1) {
      const point = transform(xs[0], ys[0]);
      return `<circle cx="${point.x}" cy="${point.y}" r="1.5" fill="${color}" />`;
    }
    const points = xs
      .map((x, index) => transform(x, ys[index]))
      .map(({ x, y }) => `${x},${y}`)
      .join(" ");
    return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" role="img" aria-label="${prompt.date} prompt">`,
    `<rect width="100%" height="100%" fill="${options.background}" />`,
    ...elements,
    "</svg>",
    "",
  ].join("\n");
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const prompt = loadPrompt(options.input, options.date);
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, renderSvg(prompt, options));
    console.log(
      `생성 완료: ${options.output} (${prompt.date}, ${prompt.strokes.length} strokes)`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
