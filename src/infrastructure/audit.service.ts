import { Injectable, Logger } from '@nestjs/common';

export interface AuditLogEntry {
  timestamp: Date;
  userId?: number;
  operation: string;
  resource: string;
  resourceId?: string | number;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  log(entry: AuditLogEntry): void {
    this.logger.log({
      level: 'info',
      message: `AUDIT: ${entry.operation} on ${entry.resource}`,
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      operation: entry.operation,
      resource: entry.resource,
      resourceId: entry.resourceId,
      changes: entry.changes,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      ...entry.metadata,
    });
  }

  logUserAction(
    userId: number,
    operation: string,
    resource: string,
    resourceId?: string | number,
    changes?: Record<string, any>,
    metadata?: Record<string, any>,
  ): void {
    this.log({
      timestamp: new Date(),
      userId,
      operation,
      resource,
      resourceId,
      changes,
      metadata,
    });
  }

  logAuthEvent(
    operation: string,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): void {
    this.log({
      timestamp: new Date(),
      userId,
      operation,
      resource: 'auth',
      ipAddress,
      userAgent,
      metadata,
    });
  }

  logMenuChange(
    userId: number,
    operation: string,
    resource: string,
    resourceId: string | number,
    changes?: Record<string, any>,
  ): void {
    this.log({
      timestamp: new Date(),
      userId,
      operation,
      resource: `menu.${resource}`,
      resourceId,
      changes,
    });
  }
}
