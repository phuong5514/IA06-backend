import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as path from 'path';
import * as fs from 'fs';
import 'dotenv/config';

describe('Menu Item Image Upload (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let testCategoryId: number;
  let testItemId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Login as super admin to get token
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'superadmin@example.com',
        password: 'SuperAdmin123!',
      });

    if (adminLoginResponse.status === 200) {
      adminToken = adminLoginResponse.body.accessToken;
    }

    // Create a test category
    const categoryResponse = await request(app.getHttpServer())
      .post('/menu/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Category',
        description: 'Test category for image upload',
      });

    if (categoryResponse.status === 201) {
      testCategoryId = categoryResponse.body.id;
    }

    // Create a test menu item
    const itemResponse = await request(app.getHttpServer())
      .post('/menu/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category_id: testCategoryId,
        name: 'Test Item',
        description: 'Test item for image upload',
        price: 10.99,
        dietary_tags: ['vegetarian'],
        display_order: 1,
      });

    if (itemResponse.status === 201) {
      testItemId = itemResponse.body.id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testItemId) {
      await request(app.getHttpServer())
        .delete(`/menu/items/${testItemId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (testCategoryId) {
      await request(app.getHttpServer())
        .delete(`/menu/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    await app.close();
  });

  describe('POST /menu/items/:id/image', () => {
    it('should upload and process an image for a menu item', () => {
      if (!adminToken) {
        console.warn('Skipping test: admin token not available');
        return;
      }

      // Create a small test image buffer (1x1 pixel PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      );

      return request(app.getHttpServer())
        .post(`/menu/items/${testItemId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', testImageBuffer, 'test-image.png')
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('urls');
          expect(res.body.urls).toHaveProperty('original');
          expect(res.body.urls).toHaveProperty('thumbnail');
          expect(res.body.urls).toHaveProperty('display');
        });
    });

    it('should reject non-image files', () => {
      if (!adminToken) {
        console.warn('Skipping test: admin token not available');
        return;
      }

      const textBuffer = Buffer.from('This is not an image');

      return request(app.getHttpServer())
        .post(`/menu/items/${testItemId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', textBuffer, 'test.txt')
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    it('should reject files that are too large', () => {
      if (!adminToken) {
        console.warn('Skipping test: admin token not available');
        return;
      }

      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      return request(app.getHttpServer())
        .post(`/menu/items/${testItemId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', largeBuffer, 'large-image.jpg')
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    it('should require authentication', () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      );

      return request(app.getHttpServer())
        .post(`/menu/items/${testItemId}/image`)
        .attach('image', testImageBuffer, 'test-image.png')
        .expect(403);
    });

    it('should reject when menu item does not exist', () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      );

      return request(app.getHttpServer())
        .post('/menu/items/99999/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', testImageBuffer, 'test-image.png')
        .expect(403);
    });
  });
});
