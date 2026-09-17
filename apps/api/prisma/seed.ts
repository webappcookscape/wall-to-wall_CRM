import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.resolve(currentDir, 'extracted-seed-data.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ extracted-seed-data.json not found!');
    process.exit(1);
  }

  console.log('🌱 Starting comprehensive data seeding from extracted database data...');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 1. Showrooms
  console.log('📍 Seeding Showrooms...');
  for (const item of data.showrooms || []) {
    await prisma.showroom.upsert({
      where: { id: item.id },
      update: { name: item.name, location: item.location },
      create: item,
    });
  }

  // 2. Brands
  console.log('🏷️ Seeding Brands...');
  for (const item of data.brands || []) {
    await prisma.brand.upsert({
      where: { id: item.id },
      update: { name: item.name, logo: item.logo },
      create: item,
    });
  }

  // 3. Stages
  console.log('📶 Seeding Stages...');
  for (const item of data.stages || []) {
    await prisma.stage.upsert({
      where: { id: item.id },
      update: { name: item.name },
      create: item,
    });
  }

  // 4. Sources
  console.log('🌐 Seeding Sources...');
  for (const item of data.sources || []) {
    await prisma.source.upsert({
      where: { id: item.id },
      update: { name: item.name },
      create: item,
    });
  }

  // 5. Projects
  console.log('🏗️ Seeding Projects...');
  for (const item of data.projects || []) {
    await prisma.project.upsert({
      where: { id: item.id },
      update: { name: item.name },
      create: item,
    });
  }

  // 6. Lead Statuses
  console.log('📊 Seeding Lead Statuses...');
  for (const item of data.statuses || []) {
    await prisma.leadStatus.upsert({
      where: { id: item.id },
      update: { name: item.name },
      create: item,
    });
  }

  // 7. Salutations
  console.log('👤 Seeding Salutations...');
  for (const item of data.salutations || []) {
    await prisma.salutation.upsert({
      where: { id: item.id },
      update: { name: item.name },
      create: item,
    });
  }

  // 8. Lead Tags
  console.log('🏷️ Seeding Lead Tags...');
  for (const item of data.tags || []) {
    await prisma.leadTag.upsert({
      where: { id: item.id },
      update: { name: item.name },
      create: item,
    });
  }

  // 9. Bank Details
  console.log('🏦 Seeding Bank Details...');
  for (const item of data.bankDetails || []) {
    await prisma.bankDetail.upsert({
      where: { accountNumber: item.accountNumber },
      update: item,
      create: item,
    });
  }

  // 10. Master Lookups
  for (const item of data.scopes || []) {
    await prisma.scopeOfWork.upsert({ where: { name: item.name }, update: {}, create: item });
  }
  for (const item of data.paymentModes || []) {
    await prisma.paymentMode.upsert({ where: { name: item.name }, update: {}, create: item });
  }
  for (const item of data.splitUps || []) {
    await prisma.splitUp.upsert({ where: { name: item.name }, update: {}, create: item });
  }
  for (const item of data.activityTypes || []) {
    await prisma.activityType.upsert({ where: { name: item.name }, update: {}, create: item });
  }
  for (const item of data.vendorSources || []) {
    await prisma.vendorSource.upsert({ where: { name: item.name }, update: {}, create: item });
  }
  for (const item of data.productionHolds || []) {
    await prisma.productionHold.upsert({ where: { name: item.name }, update: {}, create: item });
  }
  for (const item of data.workNotifications || []) {
    await prisma.workNotification.upsert({ where: { name: item.name }, update: {}, create: item });
  }
  for (const item of data.smsTemplates || []) {
    await prisma.smsTemplate.upsert({ where: { name: item.name }, update: {}, create: item });
  }
  for (const item of data.emailTemplates || []) {
    await prisma.emailTemplate.upsert({ where: { name: item.name }, update: {}, create: item });
  }

  // 11. Users (first pass without businessHead to avoid self-reference errors)
  console.log('👥 Seeding Users...');
  for (const user of data.users || []) {
    const { businessHeadId, ...userData } = user;
    await prisma.user.upsert({
      where: { id: user.id },
      update: { ...userData },
      create: { ...userData },
    });
  }
  // Second pass for businessHead relations
  for (const user of data.users || []) {
    if (user.businessHeadId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { businessHeadId: user.businessHeadId },
      });
    }
  }

  // 12. Leads
  console.log('📋 Seeding Leads...');
  for (const lead of data.leads || []) {
    const { leadId, ...leadData } = lead;
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: {
        ...leadData,
        createdAt: new Date(lead.createdAt),
        updatedAt: new Date(lead.updatedAt),
        contactableDate: lead.contactableDate ? new Date(lead.contactableDate) : null,
        dataCollected: lead.dataCollected ? new Date(lead.dataCollected) : null,
        nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp) : null,
      },
      create: {
        ...leadData,
        createdAt: new Date(lead.createdAt),
        updatedAt: new Date(lead.updatedAt),
        contactableDate: lead.contactableDate ? new Date(lead.contactableDate) : null,
        dataCollected: lead.dataCollected ? new Date(lead.dataCollected) : null,
        nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp) : null,
      },
    });
  }

  // 13. Tasks
  console.log('✅ Seeding Tasks...');
  for (const task of data.tasks || []) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      },
      create: {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      },
    });
  }

  // 14. Appointments
  console.log('📅 Seeding Appointments...');
  for (const appt of data.appointments || []) {
    await prisma.appointment.upsert({
      where: { id: appt.id },
      update: {
        ...appt,
        appointmentDate: new Date(appt.appointmentDate),
        createdAt: new Date(appt.createdAt),
        updatedAt: new Date(appt.updatedAt),
      },
      create: {
        ...appt,
        appointmentDate: new Date(appt.appointmentDate),
        createdAt: new Date(appt.createdAt),
        updatedAt: new Date(appt.updatedAt),
      },
    });
  }

  // 15. Showroom Visits
  console.log('🏬 Seeding Showroom Visits...');
  for (const visit of data.showroomVisits || []) {
    await prisma.showroomVisit.upsert({
      where: { id: visit.id },
      update: {
        ...visit,
        visitDate: new Date(visit.visitDate),
        createdAt: new Date(visit.createdAt),
        updatedAt: new Date(visit.updatedAt),
      },
      create: {
        ...visit,
        visitDate: new Date(visit.visitDate),
        createdAt: new Date(visit.createdAt),
        updatedAt: new Date(visit.updatedAt),
      },
    });
  }

  // 16. Lead Activities
  console.log('📝 Seeding Lead Activities...');
  for (const act of data.leadActivities || []) {
    await prisma.leadActivity.upsert({
      where: { id: act.id },
      update: {
        ...act,
        createdAt: new Date(act.createdAt),
      },
      create: {
        ...act,
        createdAt: new Date(act.createdAt),
      },
    });
  }

  console.log('🎉 Data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
