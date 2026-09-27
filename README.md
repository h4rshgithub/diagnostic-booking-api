# Diagnostic Test Booking API

A production-quality REST API for booking diagnostic tests at medical centres, with simulated payment processing and idempotent webhook handling.

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: Zod
- **Logging**: pino + pino-http
- **Rate Limiting**: express-rate-limit
- **Testing**: Vitest + Supertest
- **Containerization**: Docker + Docker Compose

## Architecture

The project follows a layered architecture without unnecessary abstractions:

```
src/
  config/       - Environment config, Prisma client, logger
  controllers/  - Thin HTTP handlers (parse input, call service, return response)
  middleware/   - Authentication, error handling, rate limiting
  routes/       - Route definitions and middleware chains
  services/     - Business logic (validation, DB queries, rules enforcement)
  schemas/      - Zod validation schemas
  utils/        - JWT signing, response helpers
  app.ts        - Express application setup
  server.ts     - HTTP server entry point with graceful shutdown
```

Controllers are thin. Business logic lives in services. A single centralized error handler middleware processes all errors, including Zod validation errors and Prisma constraint violations.

## Database Design

```
User (id, name, email, password_hash, role, created_at, updated_at)
  |
  +--------< Booking (id, user_id, test_id, centre_id, appointment_datetime, amount, status)
                |
                +----> DiagnosticTest (id, name, price)
                |
                +----> Centre (id, name, location)
                |
                +----> Payment (id, booking_id, amount, status, transaction_id)

DiagnosticTest <---> Centre via CentreTest (centre_id, test_id) [many-to-many join table]

ProcessedWebhookEvent (id, event_id UNIQUE, created_at)
```

**Key design decisions:**
- Booking amount is copied from the test price at booking time (not trusted from client)
- CentreTest enforces that a test must be offered at a centre before booking
- ProcessedWebhookEvent uses a database UNIQUE constraint on event_id for race-safe idempotency
- Indexes on bookings.user_id, test_id, centre_id, status for query performance

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- npm 9+

### 1. Clone and install dependencies

```bash
git clone <repo>
cd diagnostic-booking-api
npm install
```

### 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable       | Description                          | Example                                      |
|----------------|--------------------------------------|----------------------------------------------|
| DATABASE_URL   | PostgreSQL connection string         | postgresql://user:pass@localhost:5432/dbname |
| JWT_SECRET     | Secret key for signing JWTs          | a-long-random-string                         |
| PORT           | HTTP port (optional, default 3000)   | 3000                                         |
| JWT_EXPIRES_IN | Token expiry (optional, default 7d)  | 7d                                           |
| BCRYPT_ROUNDS  | bcrypt cost factor (default 12)      | 12                                           |
| NODE_ENV       | Environment (development/production) | development                                  |

### 3. Run migrations

```bash
npx prisma migrate deploy
```

Or for development with migration creation:

```bash
npx prisma migrate dev --name init
```

### 4. Seed the admin user

```bash
npx tsx prisma/seed.ts
```

This creates:

| Field    | Value                   |
|----------|-------------------------|
| Email    | admin@diagnostics.com   |
| Password | Admin@1234              |
| Role     | ADMIN                   |

Change the password in a production environment.

### 5. Start the server

```bash
npm run dev
```

Or build and run:

```bash
npm run build
npm start
```

## Running with Docker Compose

```bash
docker-compose up --build
```

This starts PostgreSQL and the API. Migrations run automatically on startup.

To run in the background:

```bash
docker-compose up -d --build
```

To stop:

```bash
docker-compose down
```

To wipe the database volume:

```bash
docker-compose down -v
```

## Running Tests

Tests require a running PostgreSQL instance. Configure `.env.test` with a test database URL (separate from your dev database).

```bash
# Create test database
createdb diagnostic_booking_test

# Run migrations against test DB
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/diagnostic_booking_test npx prisma migrate deploy

# Run tests
npm test
```

## API Endpoints

### Authentication

| Method | Path          | Auth | Description          |
|--------|---------------|------|----------------------|
| POST   | /auth/signup  | None | Register a new user  |
| POST   | /auth/login   | None | Login, returns JWT   |

### Centres

| Method | Path           | Auth  | Description          |
|--------|----------------|-------|----------------------|
| POST   | /centres       | Admin | Create a centre      |
| GET    | /centres       | None  | List all centres     |
| GET    | /centres/:id   | None  | Get a single centre  |
| PUT    | /centres/:id   | Admin | Update a centre      |
| DELETE | /centres/:id   | Admin | Delete a centre      |

### Diagnostic Tests

| Method | Path        | Auth  | Description       |
|--------|-------------|-------|-------------------|
| POST   | /tests      | Admin | Create a test     |
| GET    | /tests      | None  | List all tests    |
| GET    | /tests/:id  | None  | Get a single test |
| PUT    | /tests/:id  | Admin | Update a test     |
| DELETE | /tests/:id  | Admin | Delete a test     |

### Bookings

| Method | Path                   | Auth | Description              |
|--------|------------------------|------|--------------------------|
| POST   | /bookings              | User | Create a booking         |
| GET    | /bookings              | User | List own bookings        |
| GET    | /bookings/:id          | User | Get a specific booking   |
| POST   | /bookings/:id/cancel   | User | Cancel a pending booking |

### Payments

| Method | Path              | Auth | Description              |
|--------|-------------------|------|--------------------------|
| POST   | /payments         | User | Process a payment        |
| POST   | /payments/webhook | None | Receive webhook events   |

### Health

| Method | Path    | Auth | Description  |
|--------|---------|------|--------------|
| GET    | /health | None | Health check |

All list endpoints support `?page=1&limit=20` for pagination.

## Example Requests

### Signup

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"password123"}'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'
```

### Create a centre (admin)

```bash
curl -X POST http://localhost:3000/centres \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"City Diagnostics","location":"123 Main St, Downtown"}'
```

### Create a test (admin)

```bash
curl -X POST http://localhost:3000/tests \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Complete Blood Count","price":500,"centreIds":["<centre-id>"]}'
```

### Book a test

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"test_id":"<test-id>","centre_id":"<centre-id>","appointment_datetime":"2027-01-15T10:00:00.000Z"}'
```

### Process payment

```bash
curl -X POST http://localhost:3000/payments \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"<booking-id>"}'
```

### Send webhook event

```bash
curl -X POST http://localhost:3000/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_abc123","booking_id":"<booking-id>","payment_status":"SUCCESS"}'
```

## Authentication Flow

1. `POST /auth/signup` with name, email, password
2. `POST /auth/login` with email, password to receive a JWT token
3. Include the token in all authenticated requests: `Authorization: Bearer <token>`
4. Tokens expire after 7 days (configurable via JWT_EXPIRES_IN)

## Booking Flow

1. Admin creates a centre via `POST /centres`
2. Admin creates a test via `POST /tests` (optionally linking to centres via `centreIds`)
3. User signs up and logs in
4. User creates a booking via `POST /bookings` (test must be available at chosen centre)
5. Booking starts in `PENDING` status with amount set from the test price
6. User pays via `POST /payments` or awaits a webhook event
7. User can cancel a `PENDING` booking via `POST /bookings/:id/cancel`

## Payment Flow

Payment is simulated locally with this deterministic rule:

- **Booking amount <= 5000**: payment `SUCCESS`, booking updated to `CONFIRMED`
- **Booking amount > 5000**: payment `FAILED`, booking updated to `FAILED`

This rule applies to both `POST /payments` (direct) and `POST /payments/webhook`.

A payment record is created for each processed booking. Duplicate payment attempts for the same booking are rejected with HTTP 400.

## Webhook Idempotency

The `/payments/webhook` endpoint is fully idempotent. The same `event_id` can be sent multiple times without side effects.

abase-level row locking for the payment processing transaction to handle very high concurrency
