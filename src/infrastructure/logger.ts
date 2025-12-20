import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for request context tracking
export const requestContext = new AsyncLocalStorage<Map<string, any>>();

@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const format = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf((info) => {
        // Add request context if available
        const context = requestContext.getStore();
        const requestId = context?.get('request_id');
        const userId = context?.get('user_id');
        const tableId = context?.get('table_id');

        const logEntry: any = {
          timestamp: info.timestamp,
          level: info.level,
          message: info.message,
          ...(info.context && { context: info.context }),
          ...(requestId && { request_id: requestId }),
          ...(userId && { user_id: userId }),
          ...(tableId && { table_id: tableId }),
          ...(info.stack && { stack: info.stack }),
        };

        // Remove sensitive fields
        if (logEntry.password) delete logEntry.password;
        if (logEntry.token) delete logEntry.token;
        if (logEntry.refresh_token) delete logEntry.refresh_token;

        return JSON.stringify(logEntry);
      }),
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format,
      transports: [
        new winston.transports.Console({
          format:
            process.env.NODE_ENV === 'development'
              ? winston.format.combine(
                  winston.format.colorize(),
                  winston.format.simple(),
                )
              : format,
        }),
        // Add file transport for production
        ...(process.env.NODE_ENV === 'production'
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
            ]
          : []),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { stack: trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Custom methods for structured logging
  logOperation(
    operation: string,
    outcome: 'success' | 'failure',
    metadata?: Record<string, any>,
  ) {
    this.logger.info('Operation', {
      operation,
      outcome,
      ...metadata,
    });
  }

  logAuthEvent(
    event: string,
    userId?: number,
    success: boolean = true,
    metadata?: Record<string, any>,
  ) {
    this.logger.info('Auth Event', {
      event,
      user_id: userId,
      success,
      ...metadata,
    });
  }

  logOrderEvent(
    event: string,
    orderId: number,
    tableId?: number,
    userId?: number,
    metadata?: Record<string, any>,
  ) {
    this.logger.info('Order Event', {
      event,
      order_id: orderId,
      table_id: tableId,
      user_id: userId,
      ...metadata,
    });
  }

  logPaymentEvent(
    event: string,
    paymentId: number | string,
    orderId?: number,
    amount?: number,
    metadata?: Record<string, any>,
  ) {
    this.logger.info('Payment Event', {
      event,
      payment_id: paymentId,
      order_id: orderId,
      amount,
      ...metadata,
    });
  }
}
