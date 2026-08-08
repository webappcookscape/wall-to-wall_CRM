import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateShowrooms() {
  console.log('🔄 Updating showrooms...');
  
  // 1. Rename Chennai - Anna Nagar
  try {
    const annaNagar = await prisma.showroom.findFirst({ where: { name: 'Chennai - Anna Nagar' } });
    if (annaNagar) {
      await prisma.showroom.update({
        where: { id: annaNagar.id },
        data: { name: 'Chennai - Nandhanam(MTRS)', location: 'Nandhanam, Chennai' }
      });
      console.log('✅ Renamed Anna Nagar to Nandhanam(MTRS)');
    } else {
      console.log('⚠️ Chennai - Anna Nagar not found (might have been renamed already)');
    }
  } catch (e) { console.error('Error renaming:', e.message); }

  // 2. Add Porur
  await prisma.showroom.upsert({
    where: { name: 'Chennai - Porur' },
    update: {},
    create: { name: 'Chennai - Porur', location: 'Porur, Chennai' }
  });
  console.log('✅ Added Chennai - Porur');

  // 3. Add Covai
  await prisma.showroom.upsert({
    where: { name: 'Coimbatore - Covai' },
    update: {},
    create: { name: 'Coimbatore - Covai', location: 'Coimbatore' }
  });
  console.log('✅ Added Coimbatore - Covai');

  console.log('✨ All updates completed.');
}

updateShowrooms()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
