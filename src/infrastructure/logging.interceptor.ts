import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger, requestContext } from '../infrastructure/logger';
import { MetricsService } from '../infrastructure/metrics';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLogger,
    private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = randomUUID();

    // Set request ID in response header
    response.setHeader('X-Request-ID', requestId);

    const now = Date.now();
    const startTime = process.hrtime();

    // Create request context store
    const store = new Map();
    store.set('request_id', requestId);

    // Add user_id if authenticated
    if (request.user?.userId) {
      store.set('user_id', request.user.userId);
    }

    // Add table_id if available in params or query
    if (request.params?.tableId || request.query?.tableId) {
      store.set('table_id', request.params?.tableId || request.query?.tableId);
    }

    return requestContext.run(store, () =>
      next.handle().pipe(
        tap({
          next: () => {
            const statusCode = response.statusCode;
            const responseTime = Date.now() - now;
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const durationSeconds = seconds + nanoseconds / 1e9;

            // Log the request
            this.logger.log(
              `${method} ${url} ${statusCode} ${responseTime}ms`,
              'HTTP',
            );

            // Record metrics
            const route = this.getRoutePattern(request);
            this.metrics.httpRequestTotal.inc({
              method,
              route,
              status_code: statusCode,
            });
            this.metrics.httpRequestDuration.observe(
              {
                method,
                route,
                status_code: statusCode,
              },
              durationSeconds,
            );
          },
          error: (error) => {
            const statusCode = error.status || 500;
            const responseTime = Date.now() - now;
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const durationSeconds = seconds + nanoseconds / 1e9;

            // Log the error
            this.logger.error(
              `${method} ${url} ${statusCode} ${responseTime}ms - ${error.message}`,
              error.stack,
              'HTTP',
            );

            // Record metrics
            const route = this.getRoutePattern(request);
            this.metrics.httpRequestTotal.inc({
              method,
              route,
              status_code: statusCode,
            });
            this.metrics.httpRequestDuration.observe(
              {
                method,
                route,
                status_code: statusCode,
              },
              durationSeconds,
            );
          },
        }),
      ),
    );
  }

  private getRoutePattern(request: any): string {
    // Try to get the route pattern from the handler
    if (request.route?.path) {
      return request.route.path;
    }

    // Fallback to URL path
    return request.url.split('?')[0];
  }
}
