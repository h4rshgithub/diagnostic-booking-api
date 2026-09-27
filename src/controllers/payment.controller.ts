import { Request, Response, NextFunction } from 'express';
import { processPaymentSchema, webhookSchema } from '../schemas/payment.schema';
import * as paymentService from '../services/payment.service';
import { success } from '../utils/response';

export async function processPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = processPaymentSchema.parse(req.body);
    const result = await paymentService.processPayment(req.user!.userId, input);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const input = webhookSchema.parse(req.body);
    await paymentService.processWebhook(input);
    res.status(200).json({ data: { message: 'Webhook processed' } });
  } catch (err) {
    next(err);
  }
}
