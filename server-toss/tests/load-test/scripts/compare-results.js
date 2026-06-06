#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ENDPOINTS = [
  "myDrawings",
  "podium",
  "start",
  "strokes",
  "submit",
  "myRanking",
  "rankings",
  "chargeChancesByAd",
];

function loadSummary(dir) {
  const filePath = path.resolve(dir, "summary.json");
  if (!fs.existsSync(filePath)) {
    console.error(`summary.json을 찾을 수 없습니다: ${filePath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getMetric(data, metricName, stat) {
  const metric = data.metrics?.[metricName];
  return metric?.values?.[stat] ?? null;
}

function formatMs(val) {
  if (val === null) return "-";
  return val.toFixed(1) + "ms";
}

function formatPercent(val) {
  if (val === null) return "-";
  return (val * 100).toFixed(2) + "%";
}

function changeStr(before, after) {
  if (before === null || after === null) return "-";
  if (before === 0) return after === 0 ? "0%" : "+Inf";
  const pct = ((after - before) / before) * 100;
  const sign = pct > 0 ? "+" : "";
  const icon = pct < -1 ? " ↓" : pct > 1 ? " ↑" : " =";
  return `${sign}${pct.toFixed(1)}%${icon}`;
}

function countThresholds(data) {
  const thresholds = data.thresholds || {};
  const entries = Object.values(thresholds);
  return {
    total: entries.length,
    passed: entries.filter((t) => t.ok !== false).length,
  };
}

function buildRows(before, after) {
  const rows = [];

  const overallMetrics = [
    {
      label: "http_req_duration p50",
      stat: "p(50)",
      metric: "http_req_duration",
      fmt: formatMs,
    },
    {
      label: "http_req_duration p95",
      stat: "p(95)",
      metric: "http_req_duration",
      fmt: formatMs,
    },
    {
      label: "http_req_duration p99",
      stat: "p(99)",
      metric: "http_req_duration",
      fmt: formatMs,
    },
    {
      label: "http_req_duration avg",
      stat: "avg",
      metric: "http_req_duration",
      fmt: formatMs,
    },
    {
      label: "http_req_failed rate",
      stat: "rate",
      metric: "http_req_failed",
      fmt: formatPercent,
    },
    {
      label: "http_reqs count",
      stat: "count",
      metric: "http_reqs",
      fmt: (v) => (v === null ? "-" : Math.round(v).toLocaleString()),
    },
  ];

  for (const m of overallMetrics) {
    const b = getMetric(before, m.metric, m.stat);
    const a = getMetric(after, m.metric, m.stat);
    rows.push({
      label: m.label,
      before: m.fmt(b),
      after: m.fmt(a),
      change: changeStr(b, a),
    });
  }

  rows.push({ label: "---", before: "---", after: "---", change: "---" });

  for (const ep of ENDPOINTS) {
    const metricKey = `http_req_duration{api:${ep}}`;
    const b = getMetric(before, metricKey, "p(95)");
    const a = getMetric(after, metricKey, "p(95)");
    if (b !== null || a !== null) {
      rows.push({
        label: `${ep} p95`,
        before: formatMs(b),
        after: formatMs(a),
        change: changeStr(b, a),
      });
    }
  }

  const tb = countThresholds(before);
  const ta = countThresholds(after);
  rows.push({ label: "---", before: "---", after: "---", change: "---" });
  rows.push({
    label: "Thresholds passed",
    before: `${tb.passed}/${tb.total}`,
    after: `${ta.passed}/${ta.total}`,
    change:
      ta.passed !== tb.passed
        ? `${ta.passed - tb.passed > 0 ? "+" : ""}${ta.passed - tb.passed}`
        : "=",
  });

  return rows;
}

function printConsoleTable(rows, beforeName, afterName) {
  const colWidths = [32, 14, 14, 12];
  const header = [
    "Metric".padEnd(colWidths[0]),
    beforeName.padStart(colWidths[1]),
    afterName.padStart(colWidths[2]),
    "Change".padStart(colWidths[3]),
  ].join(" | ");

  const separator = colWidths.map((w) => "─".repeat(w)).join("─┼─");

  console.log(header);
  console.log(separator);

  for (const row of rows) {
    if (row.label === "---") {
      console.log(separator);
      continue;
    }
    console.log(
      [
        row.label.padEnd(colWidths[0]),
        row.before.padStart(colWidths[1]),
        row.after.padStart(colWidths[2]),
        row.change.padStart(colWidths[3]),
      ].join(" | "),
    );
  }
}

function printMarkdownTable(rows, beforeName, afterName) {
  console.log(`| Metric | ${beforeName} | ${afterName} | Change |`);
  console.log(`|--------|--------|--------|--------|`);

  for (const row of rows) {
    if (row.label === "---") continue;
    console.log(
      `| ${row.label} | ${row.before} | ${row.after} | ${row.change} |`,
    );
  }
}

function main() {
  const args = process.argv.slice(2);
  const markdown = args.includes("--markdown");
  const dirs = args.filter((a) => !a.startsWith("--"));

  if (dirs.length !== 2) {
    console.error(
      "Usage: compare-results.js <before-dir> <after-dir> [--markdown]",
    );
    console.error(
      "Example: node compare-results.js results/20250605-143022 results/20250605-151500",
    );
    process.exit(1);
  }

  const [beforeDir, afterDir] = dirs;
  const before = loadSummary(beforeDir);
  const after = loadSummary(afterDir);

  const beforeName = path.basename(beforeDir);
  const afterName = path.basename(afterDir);

  const rows = buildRows(before, after);

  if (markdown) {
    printMarkdownTable(rows, beforeName, afterName);
  } else {
    printConsoleTable(rows, beforeName, afterName);
  }
}

main();
