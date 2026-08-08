import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const firstNames = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Aditya', 'Sai', 'Arjun', 'Isha', 'Riya', 'Karthik', 'Nitin', 'Meera', 'Sneha', 'Rahul', 'Rohit', 'Pooja', 'Neha', 'Sanjay', 'Vikram'];
const lastNames = ['Sharma', 'Verma', 'Gupta', 'Kumar', 'Singh', 'Patel', 'Desai', 'Joshi', 'Reddy', 'Nair', 'Menon', 'Iyer', 'Pillai', 'Rao', 'Das', 'Sen', 'Banerjee', 'Bose', 'Chopra', 'Kapoor'];

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function getRandomItem(array: any[]) {
  return array[getRandomInt(array.length)];
}

async function main() {
  console.log('Starting to generate 200 leads...');

  const statuses = await prisma.leadStatus.findMany();
  const brands = await prisma.brand.findMany();
  const projects = await prisma.project.findMany();
  const sources = await prisma.source.findMany();
  const users = await prisma.user.findMany({ where: { role: { not: 'ADMIN' } } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!statuses.length || !brands.length || !projects.length || !sources.length || !users.length || !admin) {
    console.error('Missing master data. Please run the main seed script first.');
    process.exit(1);
  }

  const leadsToCreate = [];

  for (let i = 0; i < 200; i++) {
    const fn = getRandomItem(firstNames);
    const ln = getRandomItem(lastNames);
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${getRandomInt(9999)}@example.com`;
    // Generate a random 10 digit phone number starting with 9, 8, or 7
    const phone = `${[9, 8, 7][getRandomInt(3)]}${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
    
    // 60% chance to be assigned to an employee
    const assignedToId = Math.random() > 0.4 ? getRandomItem(users).id : null;

    leadsToCreate.push({
      name,
      email,
      phone,
      statusId: getRandomItem(statuses).id,
      brandId: getRandomItem(brands).id,
      projectId: getRandomItem(projects).id,
      sourceId: getRandomItem(sources).id,
      rating: getRandomInt(5) + 1,
      assignedToId,
      createdById: admin.id,
      contactableDate: new Date(Date.now() - getRandomInt(30 * 24 * 60 * 60 * 1000)), // Random date in last 30 days
    });
  }

  // Use createMany for bulk insert
  const result = await prisma.lead.createMany({
    data: leadsToCreate,
  });

  console.log(`Successfully created ${result.count} leads!`);

  // Now we need to create some activities to log the assignments
  console.log('Creating assignment logs...');
  const newLeads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  const activities = newLeads.map(lead => ({
    leadId: lead.id,
    type: 'SYSTEM',
    content: lead.assignedToId ? `System generated lead and automatically assigned.` : `System generated lead. Awaiting assignment.`,
    userId: admin.id
  }));

  await prisma.leadActivity.createMany({
    data: activities
  });

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
