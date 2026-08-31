import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function extract() {
  console.log('🔄 Connecting to local database and extracting all records...');

  const showrooms = await prisma.showroom.findMany();
  const brands = await prisma.brand.findMany();
  const stages = await prisma.stage.findMany();
  const sources = await prisma.source.findMany();
  const projects = await prisma.project.findMany();
  const statuses = await prisma.leadStatus.findMany();
  const salutations = await prisma.salutation.findMany();
  const tags = await prisma.leadTag.findMany();
  const bankDetails = await prisma.bankDetail.findMany();
  const scopes = await prisma.scopeOfWork.findMany();
  const paymentModes = await prisma.paymentMode.findMany();
  const splitUps = await prisma.splitUp.findMany();
  const activityTypes = await prisma.activityType.findMany();
  const vendorSources = await prisma.vendorSource.findMany();
  const productionHolds = await prisma.productionHold.findMany();
  const workNotifications = await prisma.workNotification.findMany();
  const questionCategories = await prisma.onlineQuestionCategory.findMany();
  const questions = await prisma.onlineQuestion.findMany();
  const smsTemplates = await prisma.smsTemplate.findMany();
  const emailTemplates = await prisma.emailTemplate.findMany();
  const signaturePhotos = await prisma.signaturePhoto.findMany();
  const users = await prisma.user.findMany();
  const leads = await prisma.lead.findMany();
  const tasks = await prisma.task.findMany();
  const appointments = await prisma.appointment.findMany();
  const showroomVisits = await prisma.showroomVisit.findMany();
  const leadActivities = await prisma.leadActivity.findMany();

  const data = {
    showrooms,
    brands,
    stages,
    sources,
    projects,
    statuses,
    salutations,
    tags,
    bankDetails,
    scopes,
    paymentModes,
    splitUps,
    activityTypes,
    vendorSources,
    productionHolds,
    workNotifications,
    questionCategories,
    questions,
    smsTemplates,
    emailTemplates,
    signaturePhotos,
    users,
    leads,
    tasks,
    appointments,
    showroomVisits,
    leadActivities,
  };

  const jsonPath = path.resolve(currentDir, '../prisma/extracted-seed-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✅ Extracted:
  - Showrooms: ${showrooms.length}
  - Brands: ${brands.length}
  - Stages: ${stages.length}
  - Sources: ${sources.length}
  - Projects: ${projects.length}
  - Statuses: ${statuses.length}
  - Salutations: ${salutations.length}
  - Tags: ${tags.length}
  - Bank Details: ${bankDetails.length}
  - Scopes: ${scopes.length}
  - Payment Modes: ${paymentModes.length}
  - SplitUps: ${splitUps.length}
  - Activity Types: ${activityTypes.length}
  - Vendor Sources: ${vendorSources.length}
  - Production Holds: ${productionHolds.length}
  - Work Notifications: ${workNotifications.length}
  - Categories: ${questionCategories.length}
  - Questions: ${questions.length}
  - SMS Templates: ${smsTemplates.length}
  - Email Templates: ${emailTemplates.length}
  - Signature Photos: ${signaturePhotos.length}
  - Users: ${users.length}
  - Leads: ${leads.length}
  - Tasks: ${tasks.length}
  - Appointments: ${appointments.length}
  - Showroom Visits: ${showroomVisits.length}
  - Lead Activities: ${leadActivities.length}
`);

  console.log(`📁 Saved to: ${jsonPath}`);
}

extract()
  .catch((e) => {
    console.error('❌ Extraction failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
