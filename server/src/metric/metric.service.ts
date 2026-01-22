import { Injectable } from '@nestjs/common';
import * as PromClient from 'prom-client';

@Injectable()
export class MetricService {
  private readonly register;

  private readonly wsResTimeHist;
  private readonly wsConnectionGauge;
  private readonly wsEventCounter;
  constructor() {
    this.register = new PromClient.Registry();

    PromClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'nestjs_',
    });

    const wsResTimeHist = new PromClient.Histogram({
      name: 'ws_client_messages_latency_seconds_bucket',
      help: 'Response time of websocket message in seconds',
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      labelNames: ['eventName'],
      registers: [this.register],
    });

    const wsConnectionGauge = new PromClient.Gauge({
      name: 'ws_connection_active',
      help: 'Number of websocket connections',
      registers: [this.register],
    });

    const wsEventCounter = new PromClient.Counter({
      name: 'ws_event_total',
      help: 'Number of websocket events',
      labelNames: ['eventName'],
      registers: [this.register],
    });

    this.wsResTimeHist = wsResTimeHist;
    this.register.registerMetric(this.wsResTimeHist);

    this.wsConnectionGauge = wsConnectionGauge;
    this.register.registerMetric(this.wsConnectionGauge);

    this.wsEventCounter = wsEventCounter;
    this.register.registerMetric(this.wsEventCounter);
  }
  startTimer() {
    return this.wsResTimeHist.startTimer();
  }

  observe(eventName: string, duration: number) {
    this.wsResTimeHist.labels(eventName).observe(duration);
  }

  incConnection() {
    this.wsConnectionGauge.inc();
  }

  decConnection() {
    this.wsConnectionGauge.dec();
  }

  incEvent(eventName: string) {
    this.wsEventCounter.labels(eventName).inc();
  }

  async getMetrics() {
    return await this.register.metrics();
  }

  static getContentType() {
    return PromClient.prometheusContentType;
  }
}
