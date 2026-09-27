# Implementation Plan: Diagnostic Test Booking API

## Project Structure

```
diagnostic-booking-api/
  src/
    config/         - env config, logger
    controllers/    - thin route handlers
    middleware/     - auth, error handler, rate limit
    routes/         - route definitions
    services/       - business logic
    schemas/        - Zod validation schemas
    utils/          - helpers (jwt, bcrypt, response)
    app.ts
    server.ts
  prisma/
    schema.prisma
    migrations/
    seed.ts
  tests/
    auth.test.ts
    centres.test.ts
    tests.test.ts
    bookings.test.ts
    payments.test.ts
    webhooks.test.ts
  Dockerfile
  docker-compose.yml
  .env.example
  README.md
```

## Execution Order

1. Init project, install deps
2. Prisma schema + migrations
3. Config + middleware
4. Auth (signup/login)
5. Centres CRUD
6. Tests CRUD
7. Bookings
8. Payments + Webhook
9. Tests (Jest + Supertest)
10. Docker files
11. README
12. Build verification
