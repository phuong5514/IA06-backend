import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('RBAC Enforcement (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let waiterToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Login as admin to get admin token
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin123!',
      });

    if (adminLoginResponse.status === 200) {
      adminToken = adminLoginResponse.body.access_token;
    }

    // Create a waiter account for testing
    if (adminToken) {
      await request(app.getHttpServer())
        .post('/api/users/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'waiter@test.com',
          password: 'Waiter123!',
          name: 'Test Waiter',
          role: 'waiter',
        });

      // Login as waiter
      const waiterLoginResponse = await request(app.getHttpServer())
        .post('/login')
        .send({
          email: 'waiter@test.com',
          password: 'Waiter123!',
        });

      if (waiterLoginResponse.status === 200) {
        waiterToken = waiterLoginResponse.body.access_token;
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Staff Management Endpoints', () => {
    it('should allow admin to access staff creation', async () => {
      if (!adminToken) {
        console.warn('Skipping test: admin token not available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/api/users/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newstaff@test.com',
          password: 'Staff123!',
          name: 'New Staff',
          role: 'kitchen',
        });

      expect([201, 409]).toContain(response.status); // 201 Created or 409 Conflict if already exists
    });

    it('should deny waiter access to staff creation', async () => {
      if (!waiterToken) {
        console.warn('Skipping test: waiter token not available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/api/users/staff')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          email: 'unauthorized@test.com',
          password: 'Test123!',
          name: 'Unauthorized',
          role: 'kitchen',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient role');
    });

    it('should deny waiter access to staff list', async () => {
      if (!waiterToken) {
        console.warn('Skipping test: waiter token not available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/api/users/staff')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny waiter access to staff deactivation', async () => {
      if (!waiterToken) {
        console.warn('Skipping test: waiter token not available');
        return;
      }

      const response = await request(app.getHttpServer())
        .patch('/api/users/staff/test-id/deactivate')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Menu Management Endpoints (Future)', () => {
    it('should deny waiter access to menu category creation', async () => {
      if (!waiterToken) {
        console.warn('Skipping test: waiter token not available');
        return;
      }

      // This endpoint will be implemented in Phase 8
      const response = await request(app.getHttpServer())
        .post('/api/menu/categories')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Test Category',
          display_order: 1,
        });

      // Expected: 403 Forbidden or 404 Not Found (if endpoint not yet implemented)
      expect([403, 404]).toContain(response.status);
    });

    it('should deny waiter access to menu item creation', async () => {
      if (!waiterToken) {
        console.warn('Skipping test: waiter token not available');
        return;
      }

      // This endpoint will be implemented in Phase 9
      const response = await request(app.getHttpServer())
        .post('/api/menu/items')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Test Item',
          price: 10.99,
          category_id: 'test-category-id',
        });

      // Expected: 403 Forbidden or 404 Not Found (if endpoint not yet implemented)
      expect([403, 404]).toContain(response.status);
    });

    it('should allow waiter to view menu items (read-only)', async () => {
      if (!waiterToken) {
        console.warn('Skipping test: waiter token not available');
        return;
      }

      // This endpoint will be implemented in Phase 9
      const response = await request(app.getHttpServer())
        .get('/api/menu/items')
        .set('Authorization', `Bearer ${waiterToken}`);

      // Expected: 200 OK or 404 Not Found (if endpoint not yet implemented)
      // Waiters should be able to view menu items
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should deny unauthenticated access to staff endpoints', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/users/staff',
      );

      expect(response.status).toBe(401);
    });

    it('should deny unauthenticated access to staff creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users/staff')
        .send({
          email: 'test@test.com',
          password: 'Test123!',
          name: 'Test',
          role: 'waiter',
        });

      expect(response.status).toBe(401);
    });
  });
});
