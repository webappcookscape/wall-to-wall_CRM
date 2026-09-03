import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateRolesEnum() {
  console.log('🔄 Step 1: Converting User.role to text...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" TYPE text USING "role"::text;`);

  console.log('🔄 Step 2: Mapping old roles (CRE, DESIGNER) to new roles...');
  await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'CLIENT_FACILITATOR' WHERE "role" = 'CRE' OR "role" = 'CLIENT-FACILITATOR';`);
  await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'FA' WHERE "role" = 'DESIGNER';`);
  await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'CLIENT_FACILITATOR' WHERE "role" NOT IN ('ADMIN', 'BUSINESS_HEAD', 'DM_EXECUTIVE', 'FA', 'LA', 'VENDOR_MANAGEMENT', 'CLIENT_FACILITATOR');`);

  console.log('🔄 Step 3: Recreating PostgreSQL Role enum...');
  await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "Role" CASCADE;`);
  await prisma.$executeRawUnsafe(`CREATE TYPE "Role" AS ENUM ('ADMIN', 'BUSINESS_HEAD', 'DM_EXECUTIVE', 'FA', 'LA', 'VENDOR_MANAGEMENT', 'CLIENT_FACILITATOR');`);

  console.log('🔄 Step 4: Converting User.role column back to Role enum...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLIENT_FACILITATOR'::"Role";`);

  console.log('✅ PostgreSQL Role enum successfully updated to (ADMIN, BUSINESS_HEAD, DM_EXECUTIVE, FA, LA, VENDOR_MANAGEMENT, CLIENT_FACILITATOR)!');
}

updateRolesEnum()
  .catch(err => {
    console.error('❌ Error updating Role enum:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
