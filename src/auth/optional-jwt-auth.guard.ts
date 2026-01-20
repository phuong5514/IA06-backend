import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 * Allows requests through whether or not they have a valid JWT token
 * If token is present and valid, req.user will be populated
 * If token is missing or invalid, req.user will be undefined
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Always allow the request to proceed
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's a valid user, return it
    // If not, return undefined (no error thrown)
    // This allows the request to proceed without authentication
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}
