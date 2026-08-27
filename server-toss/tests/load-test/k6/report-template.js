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

function getMetricValue(data, metricName, stat) {
  const metric = data.metrics[metricName];
  if (!metric || !metric.values) return null;
  return metric.values[stat] ?? null;
}

function getThresholdLimit(thresholdDef) {
  if (!thresholdDef || !thresholdDef.length) return null;
  const match = thresholdDef[0].match(/p\(\d+\)\s*<\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function formatMs(val) {
  if (val === null || val === undefined) return "-";
  return val.toFixed(1);
}

function formatPercent(val) {
  if (val === null || val === undefined) return "-";
  return (val * 100).toFixed(2) + "%";
}

function getThresholdStatus(data) {
  const results = [];
  const thresholdData = data.thresholds || {};
  for (const [name, info] of Object.entries(thresholdData)) {
    results.push({
      name,
      ok: info.ok !== false,
    });
  }
  return results;
}

export function generateHtmlReport(data, config) {
  const { maxVUs, stages, thresholds } = config;
  const now = new Date().toISOString();

  const overallP50 = getMetricValue(data, "http_req_duration", "p(50)");
  const overallP95 = getMetricValue(data, "http_req_duration", "p(95)");
  const overallP99 = getMetricValue(data, "http_req_duration", "p(99)");
  const overallAvg = getMetricValue(data, "http_req_duration", "avg");
  const overallMin = getMetricValue(data, "http_req_duration", "min");
  const overallMax = getMetricValue(data, "http_req_duration", "max");
  const totalReqs = getMetricValue(data, "http_reqs", "count");
  const failRate = getMetricValue(data, "http_req_failed", "rate");

  const endpointData = ENDPOINTS.map((ep) => {
    const metricKey = `http_req_duration{api:${ep}}`;
    const thresholdKey = `http_req_duration{api:${ep}}`;
    return {
      name: ep,
      p50: getMetricValue(data, metricKey, "p(50)"),
      p95: getMetricValue(data, metricKey, "p(95)"),
      p99: getMetricValue(data, metricKey, "p(99)"),
      avg: getMetricValue(data, metricKey, "avg"),
      count: getMetricValue(data, metricKey, "count"),
      threshold: getThresholdLimit(thresholds[thresholdKey]),
    };
  }).filter((ep) => ep.p95 !== null);

  const thresholdResults = getThresholdStatus(data);
  const passCount = thresholdResults.filter((t) => t.ok).length;
  const totalThresholds = thresholdResults.length;

  const chartLabels = JSON.stringify(endpointData.map((e) => e.name));
  const chartP95 = JSON.stringify(endpointData.map((e) => e.p95));
  const chartThresholds = JSON.stringify(endpointData.map((e) => e.threshold));

  const stagesSummary = stages
    .map((s) => `${s.duration} → ${s.target} VUs`)
    .join(" | ");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>k6 Load Test Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
  .container { max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 24px; }
  .card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card h2 { font-size: 1.1rem; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .stat { text-align: center; }
  .stat .value { font-size: 1.4rem; font-weight: 700; }
  .stat .label { font-size: 0.75rem; color: #888; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { padding: 8px 12px; text-align: right; border-bottom: 1px solid #eee; }
  th { text-align: right; font-weight: 600; color: #555; }
  th:first-child, td:first-child { text-align: left; }
  .pass { color: #16a34a; font-weight: 600; }
  .fail { color: #dc2626; font-weight: 600; }
  .chart-container { position: relative; height: 320px; }
  .threshold-summary { font-size: 0.9rem; margin-bottom: 8px; }
</style>
</head>
<body>
<div class="container">
  <h1>Load Test Report</h1>
  <div class="meta">${now} &middot; Max ${maxVUs} VUs &middot; ${stagesSummary}</div>

  <div class="card">
    <h2>Summary</h2>
    <div class="grid">
      <div class="stat"><div class="value">${totalReqs !== null ? Math.round(totalReqs).toLocaleString() : "-"}</div><div class="label">Total Requests</div></div>
      <div class="stat"><div class="value ${failRate > 0.01 ? "fail" : "pass"}">${formatPercent(failRate)}</div><div class="label">Error Rate</div></div>
      <div class="stat"><div class="value">${formatMs(overallAvg)}ms</div><div class="label">Avg</div></div>
      <div class="stat"><div class="value">${formatMs(overallP50)}ms</div><div class="label">p50</div></div>
      <div class="stat"><div class="value">${formatMs(overallP95)}ms</div><div class="label">p95</div></div>
      <div class="stat"><div class="value">${formatMs(overallP99)}ms</div><div class="label">p99</div></div>
      <div class="stat"><div class="value">${formatMs(overallMin)}ms</div><div class="label">Min</div></div>
      <div class="stat"><div class="value">${formatMs(overallMax)}ms</div><div class="label">Max</div></div>
    </div>
  </div>

  <div class="card">
    <h2>Endpoint p95 Latency vs Threshold</h2>
    <div class="chart-container"><canvas id="chart"></canvas></div>
  </div>

  <div class="card">
    <h2>Endpoint Breakdown</h2>
    <table>
      <thead><tr><th>Endpoint</th><th>Count</th><th>Avg</th><th>p50</th><th>p95</th><th>p99</th><th>Threshold</th><th>Status</th></tr></thead>
      <tbody>
        ${endpointData
          .map((ep) => {
            const ok = ep.threshold === null || ep.p95 <= ep.threshold;
            return `<tr>
            <td>${ep.name}</td>
            <td>${ep.count !== null ? Math.round(ep.count).toLocaleString() : "-"}</td>
            <td>${formatMs(ep.avg)}ms</td>
            <td>${formatMs(ep.p50)}ms</td>
            <td>${formatMs(ep.p95)}ms</td>
            <td>${formatMs(ep.p99)}ms</td>
            <td>${ep.threshold !== null ? ep.threshold + "ms" : "-"}</td>
            <td class="${ok ? "pass" : "fail"}">${ok ? "PASS" : "FAIL"}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Thresholds (${passCount}/${totalThresholds})</h2>
    <table>
      <thead><tr><th>Threshold</th><th>Status</th></tr></thead>
      <tbody>
        ${thresholdResults
          .map(
            (t) =>
              `<tr><td>${t.name}</td><td class="${t.ok ? "pass" : "fail"}">${t.ok ? "PASS" : "FAIL"}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>
</div>

<script>
new Chart(document.getElementById('chart'), {
  type: 'bar',
  data: {
    labels: ${chartLabels},
    datasets: [
      {
        label: 'p95 (ms)',
        data: ${chartP95},
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderRadius: 4,
      },
      {
        label: 'Threshold (ms)',
        data: ${chartThresholds},
        type: 'line',
        borderColor: '#dc2626',
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 4,
        pointBackgroundColor: '#dc2626',
        fill: false,
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'ms' } }
    }
  }
});
</script>
</body>
</html>`;
}
