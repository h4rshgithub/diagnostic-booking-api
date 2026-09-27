import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma';


async function seed() {
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@diagnostics.com' },
  });

  if (existing) {
    console.log('Admin user already exists, skipping seed.');
    return;
  }

  const password_hash = await bcrypt.hash('Admin@1234', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@diagnostics.com',
      password_hash,
      role: 'ADMIN',
    },
  });

  console.log('Seeded admin user:', admin.email);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
