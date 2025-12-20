import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Menu Categories (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Login as admin to get admin token
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin123!',
      });

    if (adminLoginResponse.status === 200) {
      adminToken = adminLoginResponse.body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /menu/categories', () => {
    it('should return categories list', () => {
      return request(app.getHttpServer())
        .get('/menu/categories')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('categories');
          expect(Array.isArray(res.body.categories)).toBe(true);
        });
    });
  });

  describe('POST /menu/categories', () => {
    it('should create a new category when authenticated as admin', () => {
      return request(app.getHttpServer())
        .post('/menu/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Category',
          description: 'A test category',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Category');
          expect(res.body.description).toBe('A test category');
        });
    });

    it('should reject creation without authentication', () => {
      return request(app.getHttpServer())
        .post('/menu/categories')
        .send({
          name: 'Test Category',
        })
        .expect(401);
    });

    it('should reject creation with invalid data', () => {
      return request(app.getHttpServer())
        .post('/menu/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing name',
        })
        .expect(400);
    });
  });

  describe('DELETE /menu/categories/:id', () => {
    let categoryId: number;

    beforeAll(async () => {
      // Create a test category
      const response = await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Category to Delete',
        });
      categoryId = response.body.id;
    });

    it('should delete category when authenticated as admin', () => {
      return request(app.getHttpServer())
        .delete(`/menu/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should reject deletion without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/menu/categories/${categoryId}`)
        .expect(401);
    });

    it('should return 404 for non-existent category', () => {
      return request(app.getHttpServer())
        .delete('/menu/categories/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    // TODO: Add test for preventing deletion when category has items
    // This will require creating menu_items table and items first
  });
});
