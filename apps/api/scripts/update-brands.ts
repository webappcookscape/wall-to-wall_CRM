import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating brand logos...');

  const brands = [
    { name: 'Cookscape', logo: '/assets/logos/Wall-to-wall_logo.jpeg' },
    // { name: 'Orbix', logo: '/assets/logos/orbix_logo.png' }
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { name: b.name },
      update: { logo: b.logo },
      create: { name: b.name, logo: b.logo }
    });
    console.log(`Updated ${b.name}`);
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
