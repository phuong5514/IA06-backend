import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const body = request.body;

    // Only log authenticated requests
    if (!user) {
      return next.handle();
    }

    // Determine action based on HTTP method
    const actionMap = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
      GET: 'VIEW',
    };

    const action = actionMap[method] || 'ACTION';

    // Extract resource information from URL
    const urlParts = url.split('/').filter(Boolean);
    let resourceType = urlParts[0]?.toUpperCase() || 'UNKNOWN';
    let resourceId = null;

    // Try to extract resource ID (usually numeric or UUID)
    const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^\d+$/i;
    for (const part of urlParts) {
      if (idPattern.test(part)) {
        resourceId = part;
        break;
      }
    }

    // Generate description
    let description = `${user.role} ${user.email} performed ${action} on ${resourceType}`;
    if (resourceId) {
      description += ` (ID: ${resourceId})`;
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log successful operations
          this.auditLogsService
            .createLog({
              userId: user.userId,
              userEmail: user.email,
              userRole: user.role,
              action,
              resourceType,
              resourceId,
              description,
              metadata: {
                method,
                url,
                body: this.sanitizeBody(body),
                statusCode: 200,
              },
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            })
            .catch((err) => {
              console.error('Failed to create audit log:', err);
            });
        },
        error: (error) => {
          // Log failed operations
          this.auditLogsService
            .createLog({
              userId: user.userId,
              userEmail: user.email,
              userRole: user.role,
              action: `${action}_FAILED`,
              resourceType,
              resourceId,
              description: `${description} - Failed with error: ${error.message}`,
              metadata: {
                method,
                url,
                body: this.sanitizeBody(body),
                error: error.message,
                statusCode: error.status || 500,
              },
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            })
            .catch((err) => {
              console.error('Failed to create audit log:', err);
            });
        },
      }),
    );
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body) return null;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'card_number'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
