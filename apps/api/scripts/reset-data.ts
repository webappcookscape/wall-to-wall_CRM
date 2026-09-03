import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function resetAndSeed() {
  console.log('🔄 Ensuring PostgreSQL Role enum has all 7 roles...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" TYPE text USING "role"::text;`);
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "Role" CASCADE;`);
    await prisma.$executeRawUnsafe(`CREATE TYPE "Role" AS ENUM ('ADMIN', 'BUSINESS_HEAD', 'DM_EXECUTIVE', 'FA', 'LA', 'VENDOR_MANAGEMENT', 'CLIENT_FACILITATOR');`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLIENT_FACILITATOR'::"Role";`);
  } catch (err) {
    console.warn('⚠️ Enum setup notice:', err);
  }

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

  console.log('👥 2. Creating exactly 2 users for each of the 7 roles (14 users in total)...');

  // Define 2 users per role for the 7 roles
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

    // 3. DM_EXECUTIVE (2 users)
    {
      username: 'dmexecutive',
      fullName: 'Karthik DM',
      email: 'dmexecutive@wall2wall.com',
      password: 'dmexecutive',
      phone: '9840011005',
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
      phone: '9840011006',
      role: 'DM_EXECUTIVE',
      status: true,
      metaAccess: true,
      showroomId: nndShowroom,
    },

    // 4. FA (2 users)
    {
      username: 'fa',
      fullName: 'Ananya Rao (FA)',
      email: 'fa@wall2wall.com',
      password: 'fa',
      phone: '9840011007',
      role: 'FA',
      status: true,
      metaAccess: false,
      showroomId: omrShowroom,
    },
    {
      username: 'bala.fa',
      fullName: 'Bala Murali (FA)',
      email: 'bala.fa@wall2wall.com',
      password: 'bala.fa',
      phone: '9840011008',
      role: 'FA',
      status: true,
      metaAccess: false,
      showroomId: nndShowroom,
    },

    // 5. LA (2 users)
    {
      username: 'la',
      fullName: 'Kiran Kumar (LA)',
      email: 'la@wall2wall.com',
      password: 'la',
      phone: '9840011009',
      role: 'LA',
      status: true,
      metaAccess: false,
      showroomId: omrShowroom,
    },
    {
      username: 'priya.la',
      fullName: 'Priya Sharma (LA)',
      email: 'priya.la@wall2wall.com',
      password: 'priya.la',
      phone: '9840011010',
      role: 'LA',
      status: true,
      metaAccess: false,
      showroomId: nndShowroom,
    },

    // 6. VENDOR_MANAGEMENT (2 users)
    {
      username: 'vendor',
      fullName: 'Ravi Teja (Vendor Mgmt)',
      email: 'vendor@wall2wall.com',
      password: 'vendor',
      phone: '9840011011',
      role: 'VENDOR_MANAGEMENT',
      status: true,
      metaAccess: false,
      showroomId: omrShowroom,
    },
    {
      username: 'manoj.vendor',
      fullName: 'Manoj Kumar (Vendor Mgmt)',
      email: 'manoj.vendor@wall2wall.com',
      password: 'manoj.vendor',
      phone: '9840011012',
      role: 'VENDOR_MANAGEMENT',
      status: true,
      metaAccess: false,
      showroomId: nndShowroom,
    },

    // 7. CLIENT_FACILITATOR (2 users)
    {
      username: 'clientfacilitator',
      fullName: 'Deepika Sundar (Client Facilitator)',
      email: 'clientfacilitator@wall2wall.com',
      password: 'clientfacilitator',
      phone: '9840011013',
      role: 'CLIENT_FACILITATOR',
      status: true,
      metaAccess: false,
      showroomId: omrShowroom,
    },
    {
      username: 'arun.cf',
      fullName: 'Arun Kumar (Client Facilitator)',
      email: 'arun.cf@wall2wall.com',
      password: 'arun.cf',
      phone: '9840011014',
      role: 'CLIENT_FACILITATOR',
      status: true,
      metaAccess: false,
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

  // Link Team Members to Business Heads
  const head = await prisma.user.findUnique({ where: { username: 'businesshead' } });
  if (head) {
    await prisma.user.updateMany({
      where: {
        username: { in: ['fa', 'la', 'vendor', 'clientfacilitator', 'dmexecutive'] }
      },
      data: { businessHeadId: head.id }
    });
  }
  const head2 = await prisma.user.findUnique({ where: { username: 'suresh.head' } });
  if (head2) {
    await prisma.user.updateMany({
      where: {
        username: { in: ['bala.fa', 'priya.la', 'manoj.vendor', 'arun.cf', 'rohit.dm'] }
      },
      data: { businessHeadId: head2.id }
    });
  }

  // 3. Seed 10 Realistic Sample Leads
  console.log('📋 3. Seeding 10 sample leads with activities & assignments...');
  const [brands, projects, sources, statuses, stages, tags, allUsers] = await Promise.all([
    prisma.brand.findMany(),
    prisma.project.findMany(),
    prisma.source.findMany(),
    prisma.leadStatus.findMany(),
    prisma.stage.findMany(),
    prisma.leadTag.findMany(),
    prisma.user.findMany(),
  ]);

  const userMap = new Map(allUsers.map(u => [u.username, u.id]));
  const statusMap = new Map(statuses.map(s => [s.name.toLowerCase(), s.id]));
  const stageMap = new Map(stages.map(s => [s.name.toLowerCase(), s.id]));
  const brandId = brands[0]?.id || null;
  const projectId = projects[0]?.id || null;
  const sourceId = sources[0]?.id || null;
  const tagIds = tags.slice(0, 2).map(t => ({ id: t.id }));
  const adminId = userMap.get('admin') || allUsers[0]?.id;

  const sampleLeadsData = [
    {
      name: 'Vikram Malhotra',
      email: 'vikram.malhotra@gmail.com',
      phone: '9840112341',
      rating: 5,
      statusName: 'fresh',
      stageName: 'initial discussion',
      assignedUsername: 'clientfacilitator',
      comments: 'Looking for complete 3BHK modular kitchen and wardrobe design in OMR.',
      instructionToPass: 'Call back tomorrow morning to arrange a site visit.',
      orderValue: null,
      ratingName: 'Hot Lead'
    },
    {
      name: 'Sneha Kulkarni',
      email: 'sneha.kulkarni@yahoo.com',
      phone: '9840112342',
      rating: 4,
      statusName: 'yet to follow-up',
      stageName: 'site visit done',
      assignedUsername: 'fa',
      comments: 'Site measurement completed yesterday. Awaiting 3D layout rendering.',
      instructionToPass: 'Share sample material catalogue on WhatsApp.',
      orderValue: 450000,
      ratingName: 'Warm Lead'
    },
    {
      name: 'Aditya Iyer',
      email: 'aditya.iyer@outlook.com',
      phone: '9840112343',
      rating: 5,
      statusName: 'follow-up',
      stageName: 'estimation shared',
      assignedUsername: 'la',
      comments: 'Client requested revised quotation with acrylic finish kitchen cabinets.',
      instructionToPass: 'Follow up on Saturday regarding the quotation review.',
      orderValue: 720000,
      ratingName: 'Hot Lead'
    },
    {
      name: 'Pooja Hegde',
      email: 'pooja.hegde@gmail.com',
      phone: '9840112344',
      rating: 4,
      statusName: 'opportunities',
      stageName: 'negotiation',
      assignedUsername: 'vendor',
      comments: 'Interested in premium hardware fittings and German soft-close hinges.',
      instructionToPass: 'Confirm delivery timeline with production team.',
      orderValue: 620000,
      ratingName: 'Warm Lead'
    },
    {
      name: 'Rohan Mehra',
      email: 'rohan.mehra@corporate.in',
      phone: '9840112345',
      rating: 5,
      statusName: 'order booked',
      stageName: 'production started',
      assignedUsername: 'businesshead',
      comments: 'Advance payment of 20% received. Final design approved.',
      instructionToPass: 'Issue factory work notification and assign supervisor.',
      orderValue: 950000,
      ratingName: 'Won'
    },
    {
      name: 'Anjali Menon',
      email: 'anjali.menon@techcorp.com',
      phone: '9840112346',
      rating: 3,
      statusName: 'follow-up',
      stageName: 'site visit scheduled',
      assignedUsername: 'arun.cf',
      comments: 'Site visit scheduled for Sunday at Nandhanam showroom.',
      instructionToPass: 'Send showroom location pin and confirmation message.',
      orderValue: 380000,
      ratingName: 'Cold Lead'
    },
    {
      name: 'Karthik Raman',
      email: 'karthik.raman@innovate.co',
      phone: '9840112347',
      rating: 4,
      statusName: 'yet to follow-up',
      stageName: 'initial discussion',
      assignedUsername: 'bala.fa',
      comments: 'Inquired via Meta Facebook Ad campaign for villa interiors.',
      instructionToPass: 'Introduce the FA designer and schedule virtual meet.',
      orderValue: null,
      ratingName: 'Warm Lead'
    },
    {
      name: 'Meera Nambiar',
      email: 'meera.nambiar@heritage.org',
      phone: '9840112348',
      rating: 5,
      statusName: 'design completed',
      stageName: 'design finalized',
      assignedUsername: 'priya.la',
      comments: '3D walkthrough and full architectural drawings completed.',
      instructionToPass: 'Present final contract for signature.',
      orderValue: 880000,
      ratingName: 'Hot Lead'
    },
    {
      name: 'Sanjay Joshi',
      email: 'sanjay.joshi@finance.in',
      phone: '9840112349',
      rating: 4,
      statusName: 'fresh',
      stageName: 'initial discussion',
      assignedUsername: 'dmexecutive',
      comments: 'Lead collected from Google Ads search for luxury interior designers in Chennai.',
      instructionToPass: 'Assign to available Client Facilitator queue.',
      orderValue: null,
      ratingName: 'Fresh'
    },
    {
      name: 'Divya Balakrishnan',
      email: 'divya.bala@gmail.com',
      phone: '9840112350',
      rating: 5,
      statusName: 'opportunities',
      stageName: 'final review',
      assignedUsername: 'manoj.vendor',
      comments: 'Custom wardrobe layout approved with walk-in closet accessories.',
      instructionToPass: 'Prepare final milestone payment schedule.',
      orderValue: 540000,
      ratingName: 'Hot Lead'
    },
  ];

  for (let i = 0; i < sampleLeadsData.length; i++) {
    const item = sampleLeadsData[i];
    const assignedUserId = userMap.get(item.assignedUsername) || adminId;
    const resolvedStatusId = statusMap.get(item.statusName) || statuses[0]?.id || null;
    const resolvedStageId = stageMap.get(item.stageName) || stages[0]?.id || null;

    const lead = await prisma.lead.create({
      data: {
        name: item.name,
        email: item.email,
        phone: item.phone,
        rating: item.rating,
        ratingName: item.ratingName,
        comments: item.comments,
        instructionToPass: item.instructionToPass,
        orderValue: item.orderValue,
        brandId,
        projectId,
        sourceId,
        statusId: resolvedStatusId,
        currentStageId: resolvedStageId,
        assignedToId: assignedUserId,
        createdById: adminId,
        contactableDate: new Date(Date.now() + (i * 24 * 3600 * 1000)), // staggered upcoming follow-ups
        tags: {
          connect: tagIds
        }
      }
    });

    // Create Initial Lead Activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: adminId,
        type: 'SYSTEM',
        content: `Lead created and assigned to ${item.assignedUsername} (${item.ratingName})`
      }
    });

    if (item.comments) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: assignedUserId,
          type: 'NOTE',
          content: item.comments
        }
      });
    }
  }

  console.log('\n📊 Database Status After Reset:');
  console.log(`- Users count: ${await prisma.user.count()}`);
  console.log(`- Leads count: ${await prisma.lead.count()}`);
  console.log(`- Tasks count: ${await prisma.task.count()}`);
  console.log(`- Activities count: ${await prisma.leadActivity.count()}`);
  console.log(`- Appointments count: ${await prisma.appointment.count()}`);
  console.log(`- Showroom Visits count: ${await prisma.showroomVisit.count()}`);

  console.log('\n🎉 Successfully reset and seeded! Here are the 2 users created for each role:\n');
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
