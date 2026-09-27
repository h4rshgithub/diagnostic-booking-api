import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import centreRoutes from './routes/centre.routes';
import testRoutes from './routes/test.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/centres', centreRoutes);
app.use('/tests', testRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payments', paymentRoutes);

app.use(errorHandler);

export default app;
