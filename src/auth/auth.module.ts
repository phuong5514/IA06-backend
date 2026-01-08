import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { AuthController } from './auth.controller';
import { RegistrationService } from './registration.service';
import { UserService } from '../app.service';
import 'dotenv/config';

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missingVars.join(', ')}\n` +
        'Please set these variables in your environment or .env file.',
    );
  }

  // Validate secret strength in production
  const minSecretLength = 32;
  if (
    process.env.JWT_ACCESS_SECRET &&
    process.env.JWT_ACCESS_SECRET.length < minSecretLength
  ) {
    throw new Error(
      `JWT_ACCESS_SECRET must be at least ${minSecretLength} characters in production.`,
    );
  }
  if (
    process.env.JWT_REFRESH_SECRET &&
    process.env.JWT_REFRESH_SECRET.length < minSecretLength
  ) {
    throw new Error(
      `JWT_REFRESH_SECRET must be at least ${minSecretLength} characters in production.`,
    );
  }
}

// Development fallback with warning
const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  (() => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '⚠️  WARNING: Using default JWT_ACCESS_SECRET. This is ONLY acceptable in development!',
      );
      return 'dev-access-secret-key-change-in-production';
    }
    throw new Error('JWT_ACCESS_SECRET is required in production');
  })();

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy, RegistrationService, UserService],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy, PassportModule, RegistrationService],
})
export class AuthModule {}
