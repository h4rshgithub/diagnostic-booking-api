import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { CreateCentreInput, UpdateCentreInput, PaginationInput } from '../schemas/centre.schema';

export async function createCentre(input: CreateCentreInput) {
  return prisma.centre.create({ data: input });
}

export async function listCentres(pagination: PaginationInput) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [centres, total] = await Promise.all([
    prisma.centre.findMany({
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        tests: {
          include: { test: { select: { id: true, name: true, price: true } } },
        },
      },
    }),
    prisma.centre.count(),
  ]);

  return {
    centres: centres.map((c) => ({
      ...c,
      tests: c.tests.map((ct) => ct.test),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getCentre(id: string) {
  const centre = await prisma.centre.findUnique({
    where: { id },
    include: {
      tests: {
        include: { test: { select: { id: true, name: true, price: true } } },
      },
    },
  });

  if (!centre) {
    throw new AppError(404, 'Centre not found');
  }

  return { ...centre, tests: centre.tests.map((ct) => ct.test) };
}

export async function updateCentre(id: string, input: UpdateCentreInput) {
  const centre = await prisma.centre.findUnique({ where: { id } });
  if (!centre) {
    throw new AppError(404, 'Centre not found');
  }

  return prisma.centre.update({
    where: { id },
    data: input,
  });
}

export async function deleteCentre(id: string) {
  const centre = await prisma.centre.findUnique({ where: { id } });
  if (!centre) {
    throw new AppError(404, 'Centre not found');
  }

  await prisma.centre.delete({ where: { id } });
}
