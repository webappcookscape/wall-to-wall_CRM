import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('🔄 Finding target statuses to delete...');
  
  // Statuses to match (case-insensitive)
  const targetNames = ['design completed', 'yet to follow-up', 'yet to followup', 'yet-to-followup', 'stage'];
  
  const allStatuses = await prisma.leadStatus.findMany();
  const statusesToDelete = allStatuses.filter(s => 
    targetNames.some(t => s.name.trim().toLowerCase() === t.toLowerCase())
  );

  console.log('Target statuses found:', statusesToDelete.map(s => `"${s.name}" (${s.id})`));

  if (statusesToDelete.length === 0) {
    console.log('No matching statuses found to delete.');
  } else {
    const statusIds = statusesToDelete.map(s => s.id);

    // 1. Find leads under these statuses
    const leadsToDelete = await prisma.lead.findMany({
      where: { statusId: { in: statusIds } },
      select: { id: true, name: true, statusId: true }
    });

    console.log(`Found ${leadsToDelete.length} lead(s) linked to target statuses.`);

    if (leadsToDelete.length > 0) {
      const leadIds = leadsToDelete.map(l => l.id);

      // Cascade delete related records
      console.log('Deleting related appointments...');
      await prisma.appointment.deleteMany({ where: { leadId: { in: leadIds } } });

      console.log('Deleting related showroom visits...');
      await prisma.showroomVisit.deleteMany({ where: { leadId: { in: leadIds } } });

      console.log('Deleting related lead activities...');
      await prisma.leadActivity.deleteMany({ where: { leadId: { in: leadIds } } });

      console.log('Deleting related tasks...');
      await prisma.task.deleteMany({ where: { leadId: { in: leadIds } } });

      // Clean up tag join table
      try {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "_LeadToLeadTag" WHERE "A" = ANY($1::text[])`,
          leadIds
        );
      } catch (e) {
        console.log('Note on tag join table cleanup:', e);
      }

      console.log('Deleting leads...');
      const resLeads = await prisma.lead.deleteMany({
        where: { id: { in: leadIds } }
      });
      console.log(`✅ Deleted ${resLeads.count} lead(s) successfully.`);
    }

    // 2. Delete the LeadStatus records
    const resStatus = await prisma.leadStatus.deleteMany({
      where: { id: { in: statusIds } }
    });
    console.log(`✅ Deleted ${resStatus.count} status record(s) from LeadStatus.`);
  }

  // Verify remaining statuses
  const remainingStatuses = await prisma.leadStatus.findMany({
    select: { id: true, name: true }
  });
  console.log('\n📊 Remaining active statuses:', remainingStatuses);

  const totalLeads = await prisma.lead.count();
  console.log(`📊 Total remaining leads: ${totalLeads}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
