import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './auth.service';
import 'dotenv/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: any) {
    // Support both 'sub' (standard JWT) and 'userId' (guest tokens)
    const userId = payload.sub || payload.userId;
    
    return { 
      userId, 
      email: payload.email, 
      role: payload.role,
      sessionId: payload.sessionId, // Preserve for guest sessions
      isGuest: payload.isGuest, // Preserve guest flag
      tableId: payload.tableId, // Preserve table context
    };
  }
}
