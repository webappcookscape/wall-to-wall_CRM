import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma.js';

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { password: hash }
  });
  console.log('✅ Admin password updated to admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
