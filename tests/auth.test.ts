import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';

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
});

describe('POST /auth/signup', () => {
  it('creates a new user and returns user data', async () => {
    const res = await request(app).post('/auth/signup').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'USER',
    });
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/auth/signup').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/auth/signup').send({
      name: 'Alice Again',
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('already registered');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/auth/signup').send({
      name: 'Alice',
      email: 'not-an-email',
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app).post('/auth/signup').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: '123',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/signup').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    });
  });

  it('returns JWT token for valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Invalid');
  });

  it('returns 401 for nonexistent email', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
  });
});
