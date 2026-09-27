import { Request, Response, NextFunction } from 'express';
import { createCentreSchema, updateCentreSchema, paginationSchema } from '../schemas/centre.schema';
import * as centreService from '../services/centre.service';
import { success } from '../utils/response';

export async function createCentre(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCentreSchema.parse(req.body);
    const centre = await centreService.createCentre(input);
    success(res, centre, 201);
  } catch (err) {
    next(err);
  }
}

export async function listCentres(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await centreService.listCentres(pagination);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getCentre(req: Request, res: Response, next: NextFunction) {
  try {
    const centre = await centreService.getCentre(req.params.id as string);
    success(res, centre);
  } catch (err) {
    next(err);
  }
}

export async function updateCentre(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCentreSchema.parse(req.body);
    const centre = await centreService.updateCentre(req.params.id as string, input);
    success(res, centre);
  } catch (err) {
    next(err);
  }
}

export async function deleteCentre(req: Request, res: Response, next: NextFunction) {
  try {
    await centreService.deleteCentre(req.params.id as string);
    res.status(200).json({ data: { message: 'Centre deleted successfully' } });
  } catch (err) {
    next(err);
  }
}
