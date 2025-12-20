import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    if (requiredRoles.includes(user.role)) return true;

    throw new ForbiddenException('Insufficient role');
  }
}

export function Roles(...roles: string[]) {
  // Simple decorator factory - usage: @Roles('admin')
  return (target: any, key?: any, descriptor?: any) => {
    Reflect.defineMetadata(
      ROLES_KEY,
      roles,
      descriptor ? descriptor.value : target,
    );
  };
}
