import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting user passwords...');

  const adminHash = await bcrypt.hash('admin123', 10);
  const defaultHash = await bcrypt.hash('Welcome@123', 10);

  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);

  for (const user of users) {
    const isSpecialAdmin = user.role === 'ADMIN' || user.username === 'admin' || user.email.includes('admin');
    const newHash = isSpecialAdmin ? adminHash : defaultHash;
    const defaultPlain = isSpecialAdmin ? 'admin123' : 'Welcome@123';

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHash,
        status: true, // ensure active
      },
    });

    console.log(`✅ Set password for "${user.username}" (${user.email}) [Role: ${user.role}] -> Password: ${defaultPlain}`);
  }

  console.log('\n🎉 Password reset completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
