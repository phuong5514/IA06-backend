import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { menuCategories } from '../../src/db/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

describe('Menu Items Availability (e2e)', () => {
  let app: INestApplication;
  let db;
  let adminToken: string;
  let testCategoryId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = drizzle(process.env.DATABASE_URL);

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
        description: 'Test category for availability',
      });

    if (categoryResponse.status === 201) {
      testCategoryId = categoryResponse.body.id;
    }
  });

  afterAll(async () => {
    // Clean up test category
    if (testCategoryId) {
      await db.delete(menuCategories).where(eq(menuCategories.id, testCategoryId));
    }
    await app.close();
  });

  it('should return only available items by default', async () => {
    // Create a test item
    const itemResponse = await request(app.getHttpServer())
      .post('/menu/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category_id: testCategoryId,
        name: 'Test Item',
        description: 'Test description',
        price: 10.99,
        is_available: true,
      });

    expect(itemResponse.status).toBe(201);
    const itemId = itemResponse.body.id;

    // Fetch items (default available_only=true)
    const response = await request(app.getHttpServer())
      .get('/menu/items')
      .expect(200);

    expect(response.body.some((i: any) => i.id === itemId)).toBe(true);

    // Set item to unavailable
    await request(app.getHttpServer())
      .put(`/menu/items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category_id: testCategoryId,
        name: 'Test Item',
        description: 'Test description',
        price: 10.99,
        is_available: false,
      })
      .expect(200);

    // Fetch items again
    const response2 = await request(app.getHttpServer())
      .get('/menu/items')
      .expect(200);

    expect(response2.body.some((i: any) => i.id === itemId)).toBe(false);

    // Fetch with available_only=false
    const response3 = await request(app.getHttpServer())
      .get('/menu/items?available_only=false')
      .expect(200);

    expect(response3.body.some((i: any) => i.id === itemId)).toBe(true);

    // Clean up
    await request(app.getHttpServer())
      .delete(`/menu/items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});