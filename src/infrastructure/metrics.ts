import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: promClient.Registry;

  // HTTP Metrics
  public readonly httpRequestDuration: promClient.Histogram;
  public readonly httpRequestTotal: promClient.Counter;

  // Authentication Metrics
  public readonly authAttempts: promClient.Counter;
  public readonly authFailures: promClient.Counter;
  public readonly activeTokens: promClient.Gauge;

  // Order Metrics
  public readonly ordersTotal: promClient.Counter;
  public readonly ordersProcessingTime: promClient.Histogram;
  public readonly ordersByStatus: promClient.Gauge;

  // Payment Metrics
  public readonly paymentsTotal: promClient.Counter;
  public readonly paymentsSuccessful: promClient.Counter;
  public readonly paymentsFailed: promClient.Counter;
  public readonly paymentAmount: promClient.Histogram;

  // QR Code Metrics
  public readonly qrScans: promClient.Counter;
  public readonly qrValidationFailures: promClient.Counter;

  // WebSocket Metrics
  public readonly wsConnections: promClient.Gauge;
  public readonly wsMessages: promClient.Counter;

  constructor() {
    this.register = new promClient.Registry();

    // Set default labels
    this.register.setDefaultLabels({
      app: 'smart-restaurant-backend',
      environment: process.env.NODE_ENV || 'development',
    });

    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });

    // HTTP Request Duration
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    // HTTP Request Total
    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // Authentication Attempts
    this.authAttempts = new promClient.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'role'],
      registers: [this.register],
    });

    // Authentication Failures
    this.authFailures = new promClient.Counter({
      name: 'auth_failures_total',
      help: 'Total number of failed authentication attempts',
      labelNames: ['method', 'reason'],
      registers: [this.register],
    });

    // Active Tokens
    this.activeTokens = new promClient.Gauge({
      name: 'active_tokens',
      help: 'Number of active JWT tokens',
      labelNames: ['token_type'],
      registers: [this.register],
    });

    // Orders Total
    this.ordersTotal = new promClient.Counter({
      name: 'orders_total',
      help: 'Total number of orders',
      labelNames: ['status'],
      registers: [this.register],
    });

    // Orders Processing Time
    this.ordersProcessingTime = new promClient.Histogram({
      name: 'order_processing_duration_seconds',
      help: 'Time taken to process orders',
      labelNames: ['status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.register],
    });

    // Orders by Status
    this.ordersByStatus = new promClient.Gauge({
      name: 'orders_by_status',
      help: 'Number of orders by status',
      labelNames: ['status'],
      registers: [this.register],
    });

    // Payments Total
    this.paymentsTotal = new promClient.Counter({
      name: 'payments_total',
      help: 'Total number of payment attempts',
      labelNames: ['method'],
      registers: [this.register],
    });

    // Payments Successful
    this.paymentsSuccessful = new promClient.Counter({
      name: 'payments_successful_total',
      help: 'Total number of successful payments',
      labelNames: ['method'],
      registers: [this.register],
    });

    // Payments Failed
    this.paymentsFailed = new promClient.Counter({
      name: 'payments_failed_total',
      help: 'Total number of failed payments',
      labelNames: ['method', 'reason'],
      registers: [this.register],
    });

    // Payment Amount
    this.paymentAmount = new promClient.Histogram({
      name: 'payment_amount',
      help: 'Payment amount distribution',
      labelNames: ['method'],
      buckets: [10, 20, 50, 100, 200, 500, 1000, 2000],
      registers: [this.register],
    });

    // QR Scans
    this.qrScans = new promClient.Counter({
      name: 'qr_scans_total',
      help: 'Total number of QR code scans',
      labelNames: ['table_id'],
      registers: [this.register],
    });

    // QR Validation Failures
    this.qrValidationFailures = new promClient.Counter({
      name: 'qr_validation_failures_total',
      help: 'Total number of QR validation failures',
      labelNames: ['reason'],
      registers: [this.register],
    });

    // WebSocket Connections
    this.wsConnections = new promClient.Gauge({
      name: 'websocket_connections',
      help: 'Number of active WebSocket connections',
      labelNames: ['room'],
      registers: [this.register],
    });

    // WebSocket Messages
    this.wsMessages = new promClient.Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['event', 'direction'],
      registers: [this.register],
    });
  }

  getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getRegister(): promClient.Registry {
    return this.register;
  }
}
