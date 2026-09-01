import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function resetAndSeed() {
  console.log('🧹 1. Cleaning up all transactional data (leads, activities, tasks, visits, appointments, users)...');

  // Delete child records first to satisfy foreign key constraints
  await prisma.leadActivity.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.showroomVisit.deleteMany({});
  await prisma.lead.deleteMany({});
  
  // Clear user self-references (businessHeadId) before deleting users
  await prisma.user.updateMany({
    data: { businessHeadId: null }
  });
  await prisma.user.deleteMany({});

  console.log('✅ All leads, activities, tasks, appointments, showroom visits, and existing users deleted.');

  // Check showrooms to link users
  const showrooms = await prisma.showroom.findMany();
  const omrShowroom = showrooms.find(s => s.name.includes('OMR'))?.id || showrooms[0]?.id || null;
  const nndShowroom = showrooms.find(s => s.name.includes('Nandhanam'))?.id || showrooms[1]?.id || omrShowroom;

  console.log('👥 2. Creating exactly 2 users for each role (10 users in total)...');

  // Define 2 users per role
  const usersToCreate = [
    // 1. ADMIN (2 users)
    {
      username: 'admin',
      fullName: 'System Administrator',
      email: 'admin@wall2wall.com',
      password: 'admin',
      phone: '9840011001',
      role: 'ADMIN',
      status: true,
      metaAccess: true,
      showroomId: omrShowroom,
    },
    {
      username: 'admin2',
      fullName: 'Operations Admin',
      email: 'admin2@wall2wall.com',
      password: 'admin2',
      phone: '9840011002',
      role: 'ADMIN',
      status: true,
      metaAccess: true,
      showroomId: nndShowroom,
    },

    // 2. BUSINESS_HEAD (2 users)
    {
      username: 'businesshead',
      fullName: 'Rajesh Sharma',
      email: 'businesshead@wall2wall.com',
      password: 'businesshead',
      phone: '9840011003',
      role: 'BUSINESS_HEAD',
      status: true,
      metaAccess: false,
      showroomId: omrShowroom,
    },
    {
      username: 'suresh.head',
      fullName: 'Suresh Gopalan',
      email: 'suresh.head@wall2wall.com',
      password: 'suresh.head',
      phone: '9840011004',
      role: 'BUSINESS_HEAD',
      status: true,
      metaAccess: false,
      showroomId: nndShowroom,
    },

    // 3. CRE (2 users)
    {
      username: 'cre',
      fullName: 'Deepika Sundar',
      email: 'cre@wall2wall.com',
      password: 'cre',
      phone: '9840011005',
      role: 'CRE',
      status: true,
      metaAccess: false,
      showroomId: omrShowroom,
    },
    {
      username: 'arun.cre',
      fullName: 'Arun Kumar',
      email: 'arun.cre@wall2wall.com',
      password: 'arun.cre',
      phone: '9840011006',
      role: 'CRE',
      status: true,
      metaAccess: false,
      showroomId: nndShowroom,
    },

    // 4. DESIGNER (2 users)
    {
      username: 'designer',
      fullName: 'Ananya Rao',
      email: 'designer@wall2wall.com',
      password: 'designer',
      phone: '9840011007',
      role: 'DESIGNER',
      status: true,
      metaAccess: false,
      showroomId: omrShowroom,
    },
    {
      username: 'bala.designer',
      fullName: 'Bala Murali',
      email: 'bala.designer@wall2wall.com',
      password: 'bala.designer',
      phone: '9840011008',
      role: 'DESIGNER',
      status: true,
      metaAccess: false,
      showroomId: nndShowroom,
    },

    // 5. DM_EXECUTIVE (2 users)
    {
      username: 'dmexecutive',
      fullName: 'Karthik DM',
      email: 'dmexecutive@wall2wall.com',
      password: 'dmexecutive',
      phone: '9840011009',
      role: 'DM_EXECUTIVE',
      status: true,
      metaAccess: true,
      showroomId: omrShowroom,
    },
    {
      username: 'rohit.dm',
      fullName: 'Rohit Verma',
      email: 'rohit.dm@wall2wall.com',
      password: 'rohit.dm',
      phone: '9840011010',
      role: 'DM_EXECUTIVE',
      status: true,
      metaAccess: true,
      showroomId: nndShowroom,
    },
  ];

  const createdUsers = [];
  for (const u of usersToCreate) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const created = await prisma.user.create({
      data: {
        username: u.username.toLowerCase().trim(),
        fullName: u.fullName,
        email: u.email.toLowerCase().trim(),
        password: hashedPassword,
        phone: u.phone,
        role: u.role as any,
        status: u.status,
        metaAccess: u.metaAccess,
        showroomId: u.showroomId,
      },
    });
    createdUsers.push({
      role: created.role,
      username: created.username,
      email: created.email,
      fullName: created.fullName,
      rawPassword: u.password,
    });
  }

  // Link CREs and Designers to Business Head (Rajesh Sharma)
  const head = await prisma.user.findUnique({ where: { username: 'businesshead' } });
  if (head) {
    await prisma.user.updateMany({
      where: {
        role: { in: ['CRE', 'DESIGNER'] },
        username: { in: ['cre', 'designer'] }
      },
      data: { businessHeadId: head.id }
    });
  }
  const head2 = await prisma.user.findUnique({ where: { username: 'suresh.head' } });
  if (head2) {
    await prisma.user.updateMany({
      where: {
        role: { in: ['CRE', 'DESIGNER'] },
        username: { in: ['arun.cre', 'bala.designer'] }
      },
      data: { businessHeadId: head2.id }
    });
  }

  console.log('\n📊 Database Status After Reset:');
  console.log(`- Users count: ${await prisma.user.count()}`);
  console.log(`- Leads count: ${await prisma.lead.count()}`);
  console.log(`- Tasks count: ${await prisma.task.count()}`);
  console.log(`- Activities count: ${await prisma.leadActivity.count()}`);
  console.log(`- Appointments count: ${await prisma.appointment.count()}`);
  console.log(`- Showroom Visits count: ${await prisma.showroomVisit.count()}`);

  console.log('\n🎉 Successfully reset! Here are the 2 users created for each role:\n');
  console.table(createdUsers);
}

resetAndSeed()
  .catch((e) => {
    console.error('❌ Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
