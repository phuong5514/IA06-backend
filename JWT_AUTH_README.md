# JWT Authentication Implementation

This backend now includes a complete JWT authentication system with access and refresh tokens.

## Features

- ✅ User registration with password hashing (bcrypt)
- ✅ User login with JWT token generation
- ✅ Access tokens (short-lived: 15 minutes)
- ✅ Refresh tokens (long-lived: 7 days)
- ✅ Refresh token rotation
- ✅ Token revocation (logout)
- ✅ Protected routes with JWT guard
- ✅ Refresh token storage in database with metadata

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the JWT secrets in `.env`:
```env
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
```

## Database Migration

Run the migration to create the `refresh_tokens` table:

```bash
npm run db:push
# or
npx drizzle-kit push
```

## API Endpoints

### Public Endpoints

#### Register a new user
```http
POST /user/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "user user@example.com registered successfully"
}
```

#### Login
```http
POST /user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Refresh Access Token
```http
POST /user/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
```http
POST /user/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Protected Endpoints

These endpoints require the `Authorization: Bearer <accessToken>` header.

#### Get Current User
```http
GET /user/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "email": "user@example.com",
  "userId": 1
}
```

#### Get Profile (Example)
```http
GET /profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "message": "This is a protected route",
  "user": {
    "userId": 1,
    "email": "user@example.com"
  }
}
```

## Token Management

### Access Tokens
- **Lifetime:** 15 minutes
- **Purpose:** Used for API authentication
- **Storage:** Store in memory (not localStorage) on frontend
- **Usage:** Include in Authorization header: `Bearer <token>`

### Refresh Tokens
- **Lifetime:** 7 days
- **Purpose:** Used to get new access tokens
- **Storage:** Store securely (httpOnly cookie recommended, or secure storage)
- **Rotation:** New refresh token issued with each refresh request

## Security Features

1. **Password Hashing:** Uses bcrypt with salt rounds of 10
2. **Token Rotation:** New refresh token generated on each refresh
3. **Token Revocation:** Refresh tokens can be revoked (logout)
4. **Token Metadata:** Stores device info and IP address
5. **Expiration Tracking:** Database tracks token expiration
6. **JTI (JWT ID):** Unique identifier for each refresh token

## Using Protected Routes

To protect a route, add the `@UseGuards(JwtAuthGuard)` decorator:

```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtectedData(@Request() req) {
  // Access user info from req.user
  return {
    userId: req.user.userId,
    email: req.user.email
  };
}
```

## Frontend Integration

### Login Flow
```javascript
// 1. Login
const response = await fetch('http://localhost:3000/user/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { accessToken, refreshToken } = await response.json();

// 2. Store tokens (use secure storage in production)
localStorage.setItem('refreshToken', refreshToken);
// Store accessToken in memory or short-lived storage

// 3. Make authenticated requests
fetch('http://localhost:3000/user/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Token Refresh Flow
```javascript
// When access token expires (401 response)
const response = await fetch('http://localhost:3000/user/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    refreshToken: localStorage.getItem('refreshToken') 
  })
});

const { accessToken, refreshToken } = await response.json();
// Update stored tokens
```

## Development

Start the server in development mode:
```bash
npm run start:dev
```

## Production Considerations

1. **Change JWT Secrets:** Use strong, random secrets in production
2. **HTTPS Only:** Always use HTTPS in production
3. **Secure Token Storage:** Use httpOnly cookies for refresh tokens
4. **Rate Limiting:** Implement rate limiting on auth endpoints
5. **Token Cleanup:** Periodically clean expired tokens from database
6. **Monitoring:** Log authentication attempts and failures
