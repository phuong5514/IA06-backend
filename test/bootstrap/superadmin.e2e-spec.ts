import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Super Admin Bootstrap (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow super admin to create admin account', async () => {
    // Assume super admin exists (created by bootstrap script)
    // Email: superadmin@example.com, Password: SuperAdmin123!

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'superadmin@example.com',
        password: 'SuperAdmin123!',
      })
      .expect(200);

    const accessToken = loginResponse.body.accessToken;
    expect(accessToken).toBeDefined();

    // Create admin account
    const createAdminResponse = await request(app.getHttpServer())
      .post('/api/users/staff')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'testadmin@example.com',
        password: 'TestAdmin123!',
        name: 'Test Admin',
        role: 'admin',
      })
      .expect(201);

    expect(createAdminResponse.body).toBeDefined();
    expect(createAdminResponse.body.email).toBe('testadmin@example.com');
    expect(createAdminResponse.body.role).toBe('admin');
  });
});
