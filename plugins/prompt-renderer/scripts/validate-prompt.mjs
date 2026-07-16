#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

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
  if (!options.input) throw new Error("--input 인자가 필요합니다.");
  if (options.appendTo && options.force !== "true") {
    throw new Error("prompt 원본에 추가하려면 --force true를 명시해야 합니다.");
  }
  return {
    input: path.resolve(options.input),
    date: options.date,
    output: options.output ? path.resolve(options.output) : undefined,
    appendTo: options.appendTo ? path.resolve(options.appendTo) : undefined,
    force: options.force === "true",
  };
}

function validatePrompt(prompt, expectedDate) {
  if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) {
    throw new Error("prompt는 { date, strokes } 객체여야 합니다.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prompt.date)) {
    throw new Error("date는 YYYY-MM-DD 형식이어야 합니다.");
  }
  if (expectedDate && prompt.date !== expectedDate) {
    throw new Error(`date 불일치: ${prompt.date} !== ${expectedDate}`);
  }
  if (!Array.isArray(prompt.strokes) || prompt.strokes.length === 0) {
    throw new Error("strokes는 비어 있지 않은 배열이어야 합니다.");
  }

  prompt.strokes.forEach((stroke, index) => {
    const [xs, ys] = stroke?.points ?? [];
    if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length) {
      throw new Error(
        `stroke[${index}].points는 길이가 같은 x/y 배열이어야 합니다.`,
      );
    }
    if (xs.length === 0)
      throw new Error(`stroke[${index}]는 비어 있을 수 없습니다.`);
    if (![...xs, ...ys].every(Number.isFinite)) {
      throw new Error(`stroke[${index}]에 유효하지 않은 좌표가 있습니다.`);
    }
    if (
      !Array.isArray(stroke.color) ||
      stroke.color.length !== 3 ||
      !stroke.color.every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 255,
      )
    ) {
      throw new Error(`stroke[${index}].color는 RGB 정수 배열이어야 합니다.`);
    }
  });

  return { date: prompt.date, strokes: prompt.strokes };
}

function readCandidate(input, expectedDate) {
  const value = JSON.parse(fs.readFileSync(input, "utf8"));
  let prompt = value;
  if (Array.isArray(value)) {
    prompt = expectedDate
      ? value.find((item) => item?.date === expectedDate)
      : value.length === 1
        ? value[0]
        : undefined;
    if (!prompt && expectedDate) {
      throw new Error(`${expectedDate} prompt가 입력에 없습니다.`);
    }
  }
  if (!prompt) throw new Error("입력에는 prompt 객체 하나만 있어야 합니다.");
  return validatePrompt(prompt, expectedDate);
}

function appendPrompt(target, prompt, force) {
  const prompts = JSON.parse(fs.readFileSync(target, "utf8"));
  if (!Array.isArray(prompts))
    throw new Error("append 대상은 prompt 배열이어야 합니다.");
  const existingIndex = prompts.findIndex((item) => item?.date === prompt.date);
  if (existingIndex >= 0 && !force) {
    throw new Error(`${prompt.date} prompt가 이미 존재합니다.`);
  }
  if (existingIndex >= 0) prompts[existingIndex] = prompt;
  else prompts.push(prompt);
  prompts.sort((left, right) => left.date.localeCompare(right.date));
  fs.writeFileSync(target, `${JSON.stringify(prompts, null, 2)}\n`);
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const prompt = readCandidate(options.input, options.date);
    if (options.output) {
      fs.mkdirSync(path.dirname(options.output), { recursive: true });
      fs.writeFileSync(options.output, `${JSON.stringify(prompt, null, 2)}\n`);
    }
    if (options.appendTo) appendPrompt(options.appendTo, prompt, options.force);
    console.log(`검증 완료: ${prompt.date} (${prompt.strokes.length} strokes)`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
