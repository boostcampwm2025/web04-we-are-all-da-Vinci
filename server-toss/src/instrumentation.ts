import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

if (process.env.OTEL_ENABLED !== "true") {
  console.log("[otel] disabled");
} else {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

  const samplerRatio = parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG || "1.0");

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "davinci-app-1",
    }),
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
        "http://localhost:4318/v1/traces",
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(samplerRatio),
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // ── 유지: http, express, nestjs-core, mysql2, pino ──
        // ── 비활성화: 이 스택에서 불필요하거나 노이즈만 만드는 것들 ──
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-router": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-net": { enabled: false },
        "@opentelemetry/instrumentation-generic-pool": { enabled: false },
        "@opentelemetry/instrumentation-undici": { enabled: false },
        "@opentelemetry/instrumentation-runtime-node": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk.shutdown().catch(() => null);
  });
}
