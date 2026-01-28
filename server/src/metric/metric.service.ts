import { Injectable } from '@nestjs/common';
import {
  Registry,
  collectDefaultMetrics,
  Histogram,
  Gauge,
  Counter,
  prometheusContentType,
} from 'prom-client';

@Injectable()
export class MetricService {
  private readonly register;

  private readonly wsResTimeHist;
  private readonly wsConnectionGauge;
  private readonly wsEventCounter;
  constructor() {
    this.register = new Registry();

    collectDefaultMetrics({
      register: this.register,
    });

    const wsResTimeHist = new Histogram({
      name: 'ws_client_messages_latency_seconds',
      help: 'Response time of websocket message in seconds',
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      labelNames: ['eventName'],
      registers: [this.register],
    });

    const wsConnectionGauge = new Gauge({
      name: 'ws_connection_active',
      help: 'Number of websocket connections',
      registers: [this.register],
    });

    const wsEventCounter = new Counter({
      name: 'ws_event_total',
      help: 'Number of websocket events',
      labelNames: ['eventName', 'result'],
      registers: [this.register],
    });

    this.wsResTimeHist = wsResTimeHist;

    this.wsConnectionGauge = wsConnectionGauge;

    this.wsEventCounter = wsEventCounter;
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

  incEvent(eventName: string, result: string) {
    this.wsEventCounter.labels(eventName, result).inc();
  }

  async getMetrics() {
    return await this.register.metrics();
  }

  static getContentType() {
    return prometheusContentType;
  }
}
