import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';

let adminToken: string;
let userToken: string;
let centreId: string;

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
    data: { name: 'Admin', email: 'admin@test.com', password_hash, role: 'ADMIN' },
  });

  const adminRes = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@1234' });
  adminToken = adminRes.body.data.token;

  await request(app)
    .post('/auth/signup')
    .send({ name: 'User', email: 'user@test.com', password: 'password123' });
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'user@test.com', password: 'password123' });
  userToken = loginRes.body.data.token;

  const centreRes = await request(app)
    .post('/centres')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'City Lab', location: 'Downtown' });
  centreId = centreRes.body.data.id;
});

describe('POST /tests', () => {
  it('admin can create a test', async () => {
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CBC', price: 500, centreIds: [centreId] });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'CBC' });
    expect(res.body.data.centres.length).toBe(1);
  });

  it('regular user cannot create a test', async () => {
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'CBC', price: 500 });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid price', async () => {
    const res = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CBC', price: -100 });

    expect(res.status).toBe(400);
  });
});

describe('GET /tests', () => {
  it('returns list of tests without authentication', async () => {
    await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CBC', price: 500 });

    const res = await request(app).get('/tests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.tests)).toBe(true);
    expect(res.body.data.tests.length).toBe(1);
  });
});

describe('GET /tests/:id', () => {
  it('returns a specific test', async () => {
    const createRes = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CBC', price: 500 });

    const id = createRes.body.data.id;
    const res = await request(app).get(`/tests/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('returns 404 for nonexistent test', async () => {
    const res = await request(app).get('/tests/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('PUT /tests/:id', () => {
  it('admin can update a test', async () => {
    const createRes = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CBC', price: 500 });

    const id = createRes.body.data.id;
    const res = await request(app)
      .put(`/tests/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 750 });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.price)).toBe(750);
  });
});

describe('DELETE /tests/:id', () => {
  it('admin can delete a test', async () => {
    const createRes = await request(app)
      .post('/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CBC', price: 500 });

    const id = createRes.body.data.id;
    const res = await request(app)
      .delete(`/tests/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const getRes = await request(app).get(`/tests/${id}`);
    expect(getRes.status).toBe(404);
  });
});
