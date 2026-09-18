import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const result = await prisma.user.updateMany({
    data: { password: hash }
  });
  console.log(`✅ Successfully updated ${result.count} users with password 'admin123'`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
