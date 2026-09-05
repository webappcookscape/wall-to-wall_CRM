import prisma from '../src/lib/prisma.js';

async function main() {
  const statuses = await prisma.leadStatus.findMany();
  console.log('STATUSES:', statuses.map(s => ({ id: s.id, name: s.name })));
  const stages = await prisma.stage.findMany();
  console.log('STAGES:', stages.map(s => ({ id: s.id, name: s.name })));
  const tags = await prisma.leadTag.findMany();
  console.log('TAGS:', tags.map(t => ({ id: t.id, name: t.name })));
  
  // Also check leads count per status
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      name: true,
      status: { select: { id: true, name: true } }
    }
  });
  console.log('LEADS SUMMARY:', leads.length, 'leads total');
  const countByStatus: Record<string, number> = {};
  leads.forEach(l => {
    const sName = l.status?.name || 'No Status';
    countByStatus[sName] = (countByStatus[sName] || 0) + 1;
  });
  console.log('COUNT BY STATUS:', countByStatus);
}

main().catch(console.error).finally(() => prisma.$disconnect());
