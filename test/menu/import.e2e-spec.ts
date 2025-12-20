import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Menu Import (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/menu/import (POST)', () => {
    it('should import valid CSV data', () => {
      const csvData = `category_name,category_description,item_name,item_description,item_price,item_image_url,item_dietary_tags,item_is_available,modifier_group_name,modifier_group_type,modifier_option_name,modifier_option_price_adjustment,modifier_option_is_available
Test Category,Test description,Test Item,Test item description,10.99,,vegetarian;gluten-free,true,,,,,`;

      return request(app.getHttpServer())
        .post('/menu/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvData), 'test.csv')
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.imported.categories).toBe(1);
          expect(res.body.imported.items).toBe(1);
          expect(res.body.imported.modifiers).toBe(0);
          expect(res.body.errors).toEqual([]);
        });
    });

    it('should handle CSV with modifiers', () => {
      const csvData = `category_name,category_description,item_name,item_description,item_price,item_image_url,item_dietary_tags,item_is_available,modifier_group_name,modifier_group_type,modifier_option_name,modifier_option_price_adjustment,modifier_option_is_available
Pizza Category,,Margherita Pizza,Classic pizza,12.99,,vegetarian,true,Size,single,Large,3.00,true
Pizza Category,,Margherita Pizza,Classic pizza,12.99,,vegetarian,true,Size,single,Medium,0.00,true
Pizza Category,,Margherita Pizza,Classic pizza,12.99,,vegetarian,true,Toppings,multiple,Extra Cheese,2.50,true`;

      return request(app.getHttpServer())
        .post('/menu/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvData), 'test.csv')
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.imported.categories).toBe(1);
          expect(res.body.imported.items).toBe(1);
          expect(res.body.imported.modifiers).toBe(3);
        });
    });

    it('should reject invalid CSV format', () => {
      const invalidCsv = `invalid,header
invalid,data`;

      return request(app.getHttpServer())
        .post('/menu/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(invalidCsv), 'test.csv')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Required field');
        });
    });

    it('should reject non-CSV files', () => {
      return request(app.getHttpServer())
        .post('/menu/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('not csv'), 'test.txt')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('File must be a CSV');
        });
    });

    it('should handle invalid price', () => {
      const csvData = `category_name,category_description,item_name,item_description,item_price,item_image_url,item_dietary_tags,item_is_available,modifier_group_name,modifier_group_type,modifier_option_name,modifier_option_price_adjustment,modifier_option_is_available
Test Category,,Invalid Item,,invalid_price,,vegetarian,true,,,,,`;

      return request(app.getHttpServer())
        .post('/menu/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvData), 'test.csv')
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.imported.items).toBe(0);
          expect(res.body.errors.length).toBeGreaterThan(0);
          expect(res.body.errors[0]).toContain('Invalid item price');
        });
    });

    it('should handle empty CSV', () => {
      const emptyCsv = `category_name,category_description,item_name,item_description,item_price,item_image_url,item_dietary_tags,item_is_available,modifier_group_name,modifier_group_type,modifier_option_name,modifier_option_price_adjustment,modifier_option_is_available`;

      return request(app.getHttpServer())
        .post('/menu/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(emptyCsv), 'test.csv')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('CSV file is empty');
        });
    });

    it('should reject request without file', () => {
      return request(app.getHttpServer())
        .post('/menu/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('No file uploaded');
        });
    });
  });
});
