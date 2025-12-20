# Smart Restaurant Backend

A NestJS-based backend for the Smart Restaurant QR-based ordering system.

## Features

- JWT Authentication with refresh tokens
- Role-based access control (Super Admin, Admin, Waiter, Kitchen, Customer)
- PostgreSQL database with Drizzle ORM
- Redis for session storage
- Email verification and password reset
- QR code token validation
- Menu management
- Order processing
- Payment integration (Stripe)

## Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis (for session storage)
- SMTP server (for email)

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

### Database
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/smart_restaurant`)

### Authentication
- `JWT_ACCESS_SECRET`: Secret key for access tokens (use strong random string in production)
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens (use strong random string in production)
- `JWT_PRIVATE_KEY`: RSA private key for RS256 (optional, falls back to HS256)
- `JWT_PUBLIC_KEY`: RSA public key for RS256 (optional)

### Redis
- `REDIS_URL`: Redis connection string (e.g., `redis://localhost:6379`)

### Email
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (usually 587 for TLS)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password

### Super Admin Bootstrap
- `SUPER_ADMIN_EMAIL`: Email for the super admin account
- `SUPER_ADMIN_PASSWORD`: Password for the super admin account

**Security Note**: Store sensitive credentials (passwords, secrets) in a secure vault like AWS Secrets Manager or 1Password. Never commit `.env` files to version control.

## Database Setup

1. Create a PostgreSQL database
2. Run migrations:
```bash
npm run db:push
```

## Bootstrap Super Admin

The super admin account is required for initial system setup. Run the bootstrap script after setting up the database:

```bash
npx ts-node scripts/bootstrap-super-admin.ts
```

**Important**:
- This script is idempotent - it will only create the super admin if one doesn't exist
- In production (`NODE_ENV=production`), the script will refuse to run if a super admin already exists
- The super admin credentials cannot be reset via the UI - document recovery procedures
- Use strong, unique credentials for the super admin account

## Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Documentation

The API follows the OpenAPI specification. View the documentation at `/docs` when running in development mode.

## Deployment

1. Ensure all environment variables are set
2. Run database migrations
3. Execute the bootstrap script (if needed)
4. Build and start the application

## License

MIT
