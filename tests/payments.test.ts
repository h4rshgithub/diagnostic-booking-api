import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';

let adminToken: string;
let userToken: string;
let centreId: string;
let cheapTestId: string;
let expensiveTestId: string;
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

async function createBooking(token: string, tId: string, cId: string) {
  const res = await request(app)
    .post('/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ test_id: tId, centre_id: cId, appointment_datetime: futureDate });
  return res.body.data;
}

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

  await request(app).post('/auth/signup').send({ name: 'User', email: 'user@test.com', password: 'password123' });
  const loginRes = await request(app).post('/auth/login').send({ email: 'user@test.com', password: 'password123' });
  userToken = loginRes.body.data.token;

  const centreRes = await request(app)
    .post('/centres')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'City Lab', location: 'Downtown' });
  centreId = centreRes.body.data.id;

  const cheapRes = await request(app)
    .post('/tests')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'CBC', price: 500, centreIds: [centreId] });
  cheapTestId = cheapRes.body.data.id;

  const expensiveRes = await request(app)
    .post('/tests')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'MRI Full Body', price: 8000, centreIds: [centreId] });
  expensiveTestId = expensiveRes.body.data.id;
});

describe('POST /payments', () => {
  it('payment succeeds when amount <= 5000', async () => {
    const booking = await createBooking(userToken, cheapTestId, centreId);

    const res = await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ booking_id: booking.id });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.status).toBe('SUCCESS');
    expect(res.body.data.booking_status).toBe('CONFIRMED');
  });

  it('payment fails when amount > 5000', async () => {
    const booking = await createBooking(userToken, expensiveTestId, centreId);

    const res = await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ booking_id: booking.id });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.status).toBe('FAILED');
    expect(res.body.data.booking_status).toBe('FAILED');
  });

  it('returns 400 when booking is already confirmed', async () => {
    const booking = await createBooking(userToken, cheapTestId, centreId);
    await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ booking_id: booking.id });

    const res = await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ booking_id: booking.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already been paid');
  });

  it('returns 400 for cancelled booking', async () => {
    const booking = await createBooking(userToken, cheapTestId, centreId);
    await request(app)
      .post(`/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    const res = await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ booking_id: booking.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('cancelled');
  });

  it('returns 404 for nonexistent booking', async () => {
    const res = await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ booking_id: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app)
      .post('/payments')
      .send({ booking_id: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(401);
  });
});

describe('POST /payments/webhook', () => {
  it('webhook processes SUCCESS and confirms booking', async () => {
    const booking = await createBooking(userToken, cheapTestId, centreId);

    const res = await request(app).post('/payments/webhook').send({
      event_id: 'evt_success_001',
      booking_id: booking.id,
      payment_status: 'SUCCESS',
    });

    expect(res.status).toBe(200);

    const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated?.status).toBe('CONFIRMED');
  });

  it('webhook processes FAILED and marks booking as failed', async () => {
    const booking = await createBooking(userToken, cheapTestId, centreId);

    const res = await request(app).post('/payments/webhook').send({
      event_id: 'evt_fail_001',
      booking_id: booking.id,
      payment_status: 'FAILED',
    });

    expect(res.status).toBe(200);

    const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated?.status).toBe('FAILED');
  });

  it('webhook is idempotent - sending same event twice does not create duplicate payment', async () => {
    const booking = await createBooking(userToken, cheapTestId, centreId);

    const payload = {
      event_id: 'evt_idempotent_001',
      booking_id: booking.id,
      payment_status: 'SUCCESS',
    };

    const res1 = await request(app).post('/payments/webhook').send(payload);
    expect(res1.status).toBe(200);

    const res2 = await request(app).post('/payments/webhook').send(payload);
    expect(res2.status).toBe(200);

    const paymentCount = await prisma.payment.count({ where: { booking_id: booking.id } });
    expect(paymentCount).toBe(1);

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updatedBooking?.status).toBe('CONFIRMED');
  });

  it('webhook returns 404 for nonexistent booking', async () => {
    const res = await request(app).post('/payments/webhook').send({
      event_id: 'evt_bad_001',
      booking_id: '00000000-0000-0000-0000-000000000000',
      payment_status: 'SUCCESS',
    });

    expect(res.status).toBe(404);
  });

  it('webhook returns 400 for invalid payment_status', async () => {
    const booking = await createBooking(userToken, cheapTestId, centreId);

    const res = await request(app).post('/payments/webhook').send({
      event_id: 'evt_bad_002',
      booking_id: booking.id,
      payment_status: 'INVALID',
    });

    expect(res.status).toBe(400);
  });
});
