import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { CreateTestInput, UpdateTestInput } from '../schemas/test.schema';
import { PaginationInput } from '../schemas/centre.schema';

export async function createTest(input: CreateTestInput) {
  const { centreIds, ...testData } = input;

  return prisma.diagnosticTest.create({
    data: {
      ...testData,
      ...(centreIds && centreIds.length > 0 && {
        centres: {
          create: centreIds.map((centre_id) => ({ centre_id })),
        },
      }),
    },
    include: {
      centres: {
        include: { centre: { select: { id: true, name: true, location: true } } },
      },
    },
  });
}

export async function listTests(pagination: PaginationInput) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [tests, total] = await Promise.all([
    prisma.diagnosticTest.findMany({
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        centres: {
          include: { centre: { select: { id: true, name: true, location: true } } },
        },
      },
    }),
    prisma.diagnosticTest.count(),
  ]);

  return {
    tests: tests.map((t) => ({
      ...t,
      centres: t.centres.map((ct) => ct.centre),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getTest(id: string) {
  const test = await prisma.diagnosticTest.findUnique({
    where: { id },
    include: {
      centres: {
        include: { centre: { select: { id: true, name: true, location: true } } },
      },
    },
  });

  if (!test) {
    throw new AppError(404, 'Test not found');
  }

  return { ...test, centres: test.centres.map((ct) => ct.centre) };
}

export async function updateTest(id: string, input: UpdateTestInput) {
  const test = await prisma.diagnosticTest.findUnique({ where: { id } });
  if (!test) {
    throw new AppError(404, 'Test not found');
  }

  const { centreIds, ...testData } = input;

  return prisma.diagnosticTest.update({
    where: { id },
    data: {
      ...testData,
      ...(centreIds !== undefined && {
        centres: {
          deleteMany: {},
          create: centreIds.map((centre_id) => ({ centre_id })),
        },
      }),
    },
    include: {
      centres: {
        include: { centre: { select: { id: true, name: true, location: true } } },
      },
    },
  });
}

export async function deleteTest(id: string) {
  const test = await prisma.diagnosticTest.findUnique({ where: { id } });
  if (!test) {
    throw new AppError(404, 'Test not found');
  }

  await prisma.diagnosticTest.delete({ where: { id } });
}
