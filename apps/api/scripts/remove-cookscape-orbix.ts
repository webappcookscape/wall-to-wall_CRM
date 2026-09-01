import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanBrandsAndProjects() {
  console.log('🧹 1. Cleaning Cookscape and Orbix brand data, preserving only Wall to Wall...');

  // 1. Ensure "Wall to Wall" brand exists
  let wallToWallBrand = await prisma.brand.findFirst({
    where: { name: { equals: 'Wall to Wall', mode: 'insensitive' } }
  });

  if (!wallToWallBrand) {
    wallToWallBrand = await prisma.brand.create({
      data: {
        name: 'Wall to Wall',
        logo: '/assets/logos/Wall-to-wall_logo.jpeg'
      }
    });
    console.log('✅ Created Wall to Wall brand record:', wallToWallBrand.id);
  } else {
    wallToWallBrand = await prisma.brand.update({
      where: { id: wallToWallBrand.id },
      data: {
        name: 'Wall to Wall',
        logo: '/assets/logos/Wall-to-wall_logo.jpeg'
      }
    });
    console.log('✅ Updated Wall to Wall brand record:', wallToWallBrand.id);
  }

  // 2. Find Cookscape and Orbix brands
  const otherBrands = await prisma.brand.findMany({
    where: {
      id: { not: wallToWallBrand.id }
    }
  });

  console.log(`Found ${otherBrands.length} other brands to remove:`, otherBrands.map(b => b.name));

  // 3. Reassign all leads from Cookscape/Orbix brands to Wall to Wall
  const otherBrandIds = otherBrands.map(b => b.id);
  if (otherBrandIds.length > 0) {
    const updatedLeads = await prisma.lead.updateMany({
      where: { brandId: { in: otherBrandIds } },
      data: { brandId: wallToWallBrand.id }
    });
    console.log(`✅ Reassigned ${updatedLeads.count} leads to Wall to Wall brand.`);

    // 4. Delete the other brands
    const deleted = await prisma.brand.deleteMany({
      where: { id: { in: otherBrandIds } }
    });
    console.log(`🗑️ Deleted ${deleted.count} other brand entries.`);
  }

  // 5. Check and rename any Projects with Cookscape/Orbix in the name
  const projects = await prisma.project.findMany();
  for (const p of projects) {
    if (/cookscape/i.test(p.name)) {
      const newName = p.name.replace(/cookscape/gi, 'Wall2Wall');
      await prisma.project.update({
        where: { id: p.id },
        data: { name: newName }
      });
      console.log(`🏗️ Renamed project "${p.name}" -> "${newName}"`);
    } else if (/orbix/i.test(p.name)) {
      const newName = p.name.replace(/orbix/gi, 'Wall2Wall');
      await prisma.project.update({
        where: { id: p.id },
        data: { name: newName }
      });
      console.log(`🏗️ Renamed project "${p.name}" -> "${newName}"`);
    }
  }

  // 6. Check and rename any Sources with Cookscape/Orbix
  const sources = await prisma.source.findMany();
  for (const s of sources) {
    if (/cookscape/i.test(s.name) || /orbix/i.test(s.name)) {
      const newName = s.name.replace(/cookscape|orbix/gi, 'Wall to Wall');
      await prisma.source.update({
        where: { id: s.id },
        data: { name: newName }
      });
      console.log(`🌐 Renamed source "${s.name}" -> "${newName}"`);
    }
  }

  console.log('\n📊 Database Status After Brand Clean:');
  const remainingBrands = await prisma.brand.findMany();
  console.log('Brands in database:', remainingBrands);
  console.log('Total Leads:', await prisma.lead.count());
  console.log('Leads linked to Wall to Wall:', await prisma.lead.count({ where: { brandId: wallToWallBrand.id } }));
  console.log('Projects:', (await prisma.project.findMany()).map(p => p.name));

  console.log('\n🎉 Successfully cleaned! Only Wall to Wall remains.');
}

cleanBrandsAndProjects()
  .catch(e => {
    console.error('❌ Error during brand cleaning:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
