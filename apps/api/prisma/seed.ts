import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive data seeding...');

  // 1. Showrooms
  const showroomsData = [
    { name: 'Chennai - OMR', location: 'OMR, Chennai' },
    { name: 'Chennai - Nandhanam(MTRS)', location: 'Nandhanam, Chennai' },
    { name: 'Bangalore - HSR', location: 'HSR Layout, Bangalore' },
    { name: 'Chennai - Porur', location: 'Porur, Chennai' },
    { name: 'Coimbatore - Covai', location: 'Coimbatore' },
  ];
  const showrooms = [];
  for (const s of showroomsData) {
    const item = await prisma.showroom.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
    showrooms.push(item);
  }

  // 2. Sources
  const sourcesData = [
    'Google Ads', 'Facebook', 'Referral', 'Walk-in', 'Website', 'Instagram'
  ];
  const sources = [];
  for (const name of sourcesData) {
    const item = await prisma.source.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    sources.push(item);
  }

  // 3. Projects
  const projectsData = [
    'False Ceiling', 'Lighting', 'Wallpaper',
    'Wall Murals','Wall Cladding','Wall Painting','Blinds','Curtains'
  ];
  const projects = [];
  for (const name of projectsData) {
    const item = await prisma.project.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    projects.push(item);
  }

  // 4. Brands
  const brandsData = [
    { name: 'Cookscape', logo: '/assets/logos/Wall-to-wall_logo.jpeg' },
    { name: 'Orbix', logo: '/assets/logos/orbix_logo.png' }
  ];
  const brands = [];
  for (const b of brandsData) {
    const item = await prisma.brand.upsert({
      where: { name: b.name },
      update: { logo: b.logo },
      create: b
    });
    brands.push(item);
  }

  // 5. Tags
  const tagsData = ['FQ', 'HOT', 'RN order', 'Follow up', 'MSMT', 'HRE', 'Online', 'Presentation'];
  const tags = [];
  for (const name of tagsData) {
    const item = await prisma.leadTag.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    tags.push(item);
  }

  // 6. Lead Statuses
  const statusesData = [
    'Fresh', 'Yet To Follow-up', 'Follow-up', 'Opportunities', 'Order Booked', 'Disqualified'
  ];
  const statuses = [];
  for (const name of statusesData) {
    const item = await prisma.leadStatus.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    statuses.push(item);
  }

  // 7. Users
  const roles = ['CRE', 'DESIGNER', 'DM_EXECUTIVE'] as const;
  const users = [];

  const defaultPassword = await bcrypt.hash('admin123', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cookscape.com' },
    update: { password: defaultPassword },
    create: {
      username: 'admin',
      fullName: 'Administrator',
      email: 'admin@cookscape.com',
      password: defaultPassword,
      role: 'ADMIN',
    }
  });
  users.push(admin);

  // CREs
  const creNames = ['Arun Kumar', 'Deepika S', 'Manoj Ray', 'Priya Mani', 'Suresh G'];
  for (const name of creNames) {
    const user = await prisma.user.upsert({
      where: { email: `${name.toLowerCase().replace(' ', '.')}@cookscape.com` },
      update: { password: defaultPassword },
      create: {
        username: name.toLowerCase().replace(' ', '_'),
        fullName: name,
        email: `${name.toLowerCase().replace(' ', '.')}@cookscape.com`,
        password: defaultPassword,
        role: 'CRE',
      }
    });
    users.push(user);
  }


  // Designers
  const desNames = ['Ananya Rao', 'Bala Murali', 'Chitra S', 'Divya P', 'Eshwar T'];
  for (const name of desNames) {
    const user = await prisma.user.upsert({
      where: { email: `${name.toLowerCase().replace(' ', '.')}@cookscape.com` },
      update: { password: defaultPassword },
      create: {
        username: name.toLowerCase().replace(' ', '_'),
        fullName: name,
        email: `${name.toLowerCase().replace(' ', '.')}@cookscape.com`,
        password: defaultPassword,
        role: 'DESIGNER',
      }
    });
    users.push(user);
  }

  console.log('✅ Master data seeded. Generating Leads and Activities...');

  // 8. Leads Data
  const leadsData = [
    {
      name: 'Dr. Jane Cooper',
      email: 'jane.cooper@example.com',
      phone: '9876543210',
      statusId: statuses.find(s => s.name === 'Fresh')?.id || '',
      brandId: brands[0]?.id || '',
      projectId: projects[0]?.id || '',
      sourceId: sources[0]?.id || '',
      rating: 5,
      activities: [
        { type: 'STATUS_CHANGE', content: 'Lead synthesized in intelligent hub.', userId: admin.id },
        { type: 'ASSIGNMENT', content: 'Automated assignment to administrator.', userId: admin.id }
      ]
    },
    {
      name: 'Robert Fox',
      email: 'robert.fox@gmail.com',
      phone: '9840123456',
      statusId: statuses.find(s => s.name === 'Follow-up')?.id || '',
      brandId: brands[1]?.id || '',
      projectId: projects[1]?.id || '',
      sourceId: sources[1]?.id || '',
      rating: 4,
      activities: [
        { type: 'STATUS_CHANGE', content: 'Lead detected via Facebook Campaign.', userId: admin.id },
        { type: 'ASSIGNMENT', content: 'Routed to core sales team.', userId: admin.id },
        { type: 'NOTE', content: 'Interested in premium Italian wardrobe finishes.', userId: admin.id },
        { type: 'STATUS_CHANGE', content: 'Progressed from Fresh to Follow-up.', userId: admin.id }
      ]
    },
    {
      name: 'Esther Howard',
      email: 'esther.h@yahoo.com',
      phone: '7766554433',
      statusId: statuses.find(s => s.name === 'Order Booked')?.id || '',
      brandId: brands[0]?.id || '',
      projectId: projects[3]?.id || '',
      sourceId: sources[3]?.id || '',
      rating: 5,
      activities: [
        { type: 'STATUS_CHANGE', content: 'Walk-in prospect at OMR Showroom.', userId: admin.id },
        { type: 'NOTE', content: 'Site visit scheduled for tomorrow.', userId: admin.id },
        { type: 'STATUS_CHANGE', content: 'Moved to Order Booked after advance payment.', userId: admin.id }
      ]
    },
    {
      name: 'Cameron Williamson',
      email: 'williamson.c@outlook.com',
      phone: '8899001122',
      statusId: statuses.find(s => s.name === 'Fresh')?.id || '',
      brandId: brands[0]?.id || '',
      projectId: projects[2]?.id || '',
      sourceId: sources[4]?.id || '',
      rating: 3,
      activities: [
        { type: 'STATUS_CHANGE', content: 'Inquiry via main website.', userId: admin.id }
      ]
    },
    {
      name: 'Annette Black',
      email: 'annette.b@gmail.com',
      phone: '9988776655',
      statusId: statuses.find(s => s.name === 'Opportunities')?.id || '',
      brandId: brands[1]?.id || '',
      projectId: projects[1]?.id || '',
      sourceId: sources[5]?.id || '',
      rating: 4,
      activities: [
        { type: 'STATUS_CHANGE', content: 'Instagram lead caught by automation.', userId: admin.id },
        { type: 'NOTE', content: 'Wants a dark-themed kitchen with glass shutters.', userId: admin.id }
      ]
    }
  ];

  for (const l of leadsData) {
    if (!l.statusId || !l.brandId || !l.projectId || !l.sourceId) {
       console.log(`⚠️  Skipping lead ${l.name} due to missing relational data.`);
       continue;
    }

    const lead = await prisma.lead.create({
      data: {
        name: l.name,
        email: l.email,
        phone: l.phone,
        statusId: l.statusId,
        brandId: l.brandId,
        projectId: l.projectId,
        sourceId: l.sourceId,
        rating: l.rating,
        createdById: admin.id
      }
    });

    for (const act of l.activities) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: act.type as any,
          content: act.content,
          userId: act.userId
        }
      });
    }
  }

  console.log('✨ Seeded 5 high-fidelity leads with interaction histories!');
  console.log('✅ Full seeding operation completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
