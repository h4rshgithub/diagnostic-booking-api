import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { config } from '../config';
import { signToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { SignupInput, LoginInput } from '../schemas/auth.schema';

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  const password_hash = await bcrypt.hash(input.password, config.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password_hash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  return user;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const passwordMatch = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = signToken(user.id, user.role);

  return { token };
}
