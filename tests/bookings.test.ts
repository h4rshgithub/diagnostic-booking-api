import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';

let adminToken: string;
let userToken: string;
let user2Token: string;
let centreId: string;
let testId: string;
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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

  const adminRes = await request(app).post('/auth/login').send({ email: 'admin@test.com', password: 'Admin@1234' });
  adminToken = adminRes.body.data.token;

  await request(app).post('/auth/signup').send({ name: 'User1', email: 'user1@test.com', password: 'password123' });
  const u1Res = await request(app).post('/auth/login').send({ email: 'user1@test.com', password: 'password123' });
  userToken = u1Res.body.data.token;

  await request(app).post('/auth/signup').send({ name: 'User2', email: 'user2@test.com', password: 'password123' });
  const u2Res = await request(app).post('/auth/login').send({ email: 'user2@test.com', password: 'password123' });
  user2Token = u2Res.body.data.token;

  const centreRes = await request(app)
    .post('/centres')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'City Lab', location: 'Downtown' });
  centreId = centreRes.body.data.id;

  const testRes = await request(app)
    .post('/tests')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'CBC', price: 500, centreIds: [centreId] });
  testId = testRes.body.data.id;
});

describe('POST /bookings', () => {
  it('authenticated user can create a booking', async () => {
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'PENDING' });
    expect(Number(res.body.data.amount)).toBe(500);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app)
      .post('/bookings')
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate });

    expect(res.status).toBe(401);
  });

  it('returns 404 for invalid test ID', async () => {
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        test_id: '00000000-0000-0000-0000-000000000000',
        centre_id: centreId,
        appointment_datetime: futureDate,
      });

    expect(res.status).toBe(404);
  });

  it('returns 404 for invalid centre ID', async () => {
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        test_id: testId,
        centre_id: '00000000-0000-0000-0000-000000000000',
        appointment_datetime: futureDate,
      });

    expect(res.status).toBe(404);
  });

  it('returns 400 when test not offered at centre', async () => {
    const anotherCentreRes = await request(app)
      .post('/centres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'West Lab', location: 'West Side' });

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        test_id: testId,
        centre_id: anotherCentreRes.body.data.id,
        appointment_datetime: futureDate,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('not offered');
  });

  it('returns 400 for past appointment_datetime', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: pastDate });

    expect(res.status).toBe(400);
  });

  it('booking amount comes from test price, not client', async () => {
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate, amount: 9999 });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.amount)).toBe(500);
  });
});

describe('GET /bookings', () => {
  it('user can list their own bookings', async () => {
    await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate });

    const res = await request(app)
      .get('/bookings')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings.length).toBe(1);
  });
});

describe('GET /bookings/:id', () => {
  it('user can access their own booking', async () => {
    const createRes = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate });

    const id = createRes.body.data.id;
    const res = await request(app)
      .get(`/bookings/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('another user cannot access booking - returns 403', async () => {
    const createRes = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate });

    const id = createRes.body.data.id;
    const res = await request(app)
      .get(`/bookings/${id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /bookings/:id/cancel', () => {
  it('user can cancel a pending booking', async () => {
    const createRes = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate });

    const id = createRes.body.data.id;
    const res = await request(app)
      .post(`/bookings/${id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('returns 409 when cancelling an already cancelled booking', async () => {
    const createRes = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate });

    const id = createRes.body.data.id;
    await request(app).post(`/bookings/${id}/cancel`).set('Authorization', `Bearer ${userToken}`);

    const res = await request(app)
      .post(`/bookings/${id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(409);
  });

  it('returns 403 when another user tries to cancel', async () => {
    const createRes = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ test_id: testId, centre_id: centreId, appointment_datetime: futureDate });

    const id = createRes.body.data.id;
    const res = await request(app)
      .post(`/bookings/${id}/cancel`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
  });
});
