import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';

let adminToken: string;
let userToken: string;

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.centreTest.deleteMany();
  await prisma.diagnosticTest.deleteMany();
  await prisma.centre.deleteMany();
  await prisma.processedWebhookEvent.deleteMany();
  await prisma.user.deleteMany();

  const password_hash = await bcrypt.hash('Admin@1234', 12);
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@test.com',
      password_hash,
      role: 'ADMIN',
    },
  });

  const adminRes = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@1234' });
  adminToken = adminRes.body.data.token;

  const userRes = await request(app)
    .post('/auth/signup')
    .send({ name: 'User', email: 'user@test.com', password: 'password123' });

  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'user@test.com', password: 'password123' });
  userToken = loginRes.body.data.token;
});

describe('POST /centres', () => {
  it('admin can create a centre', async () => {
    const res = await request(app)
      .post('/centres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'City Lab', location: 'Downtown' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'City Lab', location: 'Downtown' });
  });

  it('regular user cannot create a centre', async () => {
    const res = await request(app)
      .post('/centres')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'City Lab', location: 'Downtown' });

    expect(res.status).toBe(403);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app)
      .post('/centres')
      .send({ name: 'City Lab', location: 'Downtown' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/centres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'City Lab' });

    expect(res.status).toBe(400);
  });
});

describe('GET /centres', () => {
  it('returns list of centres without authentication', async () => {
    await request(app)
      .post('/centres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'City Lab', location: 'Downtown' });

    const res = await request(app).get('/centres');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.centres)).toBe(true);
    expect(res.body.data.centres.length).toBe(1);
  });
});

describe('GET /centres/:id', () => {
  it('returns a specific centre', async () => {
    const createRes = await request(app)
      .post('/centres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'City Lab', location: 'Downtown' });

    const id = createRes.body.data.id;
    const res = await request(app).get(`/centres/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('returns 404 for nonexistent centre', async () => {
    const res = await request(app).get('/centres/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('PUT /centres/:id', () => {
  it('admin can update a centre', async () => {
    const createRes = await request(app)
      .post('/centres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'City Lab', location: 'Downtown' });

    const id = createRes.body.data.id;
    const res = await request(app)
      .put(`/centres/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Lab' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Lab');
  });
});

describe('DELETE /centres/:id', () => {
  it('admin can delete a centre', async () => {
    const createRes = await request(app)
      .post('/centres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'City Lab', location: 'Downtown' });

    const id = createRes.body.data.id;
    const res = await request(app)
      .delete(`/centres/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const getRes = await request(app).get(`/centres/${id}`);
    expect(getRes.status).toBe(404);
  });
});
