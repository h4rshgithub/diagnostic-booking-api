import { Request, Response, NextFunction } from 'express';
import { createTestSchema, updateTestSchema } from '../schemas/test.schema';
import { paginationSchema } from '../schemas/centre.schema';
import * as testService from '../services/test.service';
import { success } from '../utils/response';

export async function createTest(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTestSchema.parse(req.body);
    const test = await testService.createTest(input);
    success(res, test, 201);
  } catch (err) {
    next(err);
  }
}

export async function listTests(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await testService.listTests(pagination);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getTest(req: Request, res: Response, next: NextFunction) {
  try {
    const test = await testService.getTest(req.params.id as string);
    success(res, test);
  } catch (err) {
    next(err);
  }
}

export async function updateTest(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTestSchema.parse(req.body);
    const test = await testService.updateTest(req.params.id as string, input);
    success(res, test);
  } catch (err) {
    next(err);
  }
}

export async function deleteTest(req: Request, res: Response, next: NextFunction) {
  try {
    await testService.deleteTest(req.params.id as string);
    res.status(200).json({ data: { message: 'Test deleted successfully' } });
  } catch (err) {
    next(err);
  }
}
