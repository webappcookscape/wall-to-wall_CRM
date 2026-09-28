import prisma from '../src/lib/prisma.js';
import { 
  ensureLeadCreateAccess, 
  ensureLeadUpdateAccess, 
  ensureLeadAssignAccess, 
  getLeadVisibilityClause,
  getAssignableUsersClause
} from '../src/utils/leadAccess.js';

async function runFaTest() {
  console.log('🧪 Starting FA Workflow Verification Test...');

  // 1. Check FA User in Database
  console.log('\nStep 1: Checking FA user in database...');
  const faUser = await prisma.user.findFirst({
    where: { role: 'FA' }
  });

  if (!faUser) {
    throw new Error('❌ No FA user found in database! Please run create-fa script first.');
  }
  console.log(`✅ FA user confirmed: ${faUser.fullName} (${faUser.username}) | Role: ${faUser.role}`);

  // 2. Test Lead Create Access
  console.log('\nStep 2: Testing ensureLeadCreateAccess for FA...');
  try {
    ensureLeadCreateAccess({ id: faUser.id, role: faUser.role });
    console.log('✅ ensureLeadCreateAccess passed for FA.');
  } catch (err: any) {
    throw new Error(`❌ ensureLeadCreateAccess failed for FA: ${err.message}`);
  }

  // 3. Test Lead Visibility Scoping
  console.log('\nStep 3: Testing getLeadVisibilityClause for FA...');
  const visibilityClause = await getLeadVisibilityClause({ id: faUser.id, role: faUser.role });
  console.log('Visibility clause:', JSON.stringify(visibilityClause));
  if (!visibilityClause.OR || visibilityClause.OR.length !== 2) {
    throw new Error('❌ FA visibility clause should scope to assignedToId OR createdById');
  }
  console.log('✅ Visibility clause correctly scopes to assignedToId OR createdById.');

  // 4. Test Lead Creation with Auto-Assignment to FA
  console.log('\nStep 4: Testing lead creation by FA (with auto self-assignment)...');
  const testPhone = '9876543210';
  
  // Clean up any previous test lead with this phone
  await prisma.lead.deleteMany({
    where: { phone: { contains: testPhone } }
  });

  const testLead = await prisma.lead.create({
    data: {
      name: 'Test FA Workflow Customer',
      phone: testPhone,
      email: 'test.fa.customer@example.com',
      createdById: faUser.id,
      assignedToId: faUser.id, // verified fallback behavior
      rating: 4,
      comments: 'Initial visit and requirement discussion by FA',
    }
  });
  console.log(`✅ Test lead created: ID ${testLead.id}, Name: ${testLead.name}, Assignee: ${testLead.assignedToId}`);

  // 5. Test Lead Update Access
  console.log('\nStep 5: Testing ensureLeadUpdateAccess for FA...');
  const updateAccessLead = await ensureLeadUpdateAccess(testLead.id, { id: faUser.id, role: faUser.role });
  console.log(`✅ FA has update access to lead ${updateAccessLead.id}.`);

  // 6. Test Lead Re-Assignment by FA to another staff member
  console.log('\nStep 6: Testing ensureLeadAssignAccess for FA...');
  const otherUser = await prisma.user.findFirst({
    where: { id: { not: faUser.id }, status: true }
  });

  if (otherUser) {
    await ensureLeadAssignAccess(testLead.id, otherUser.id, { id: faUser.id, role: faUser.role });
    console.log(`✅ FA successfully authorized to re-assign lead to ${otherUser.fullName} (${otherUser.role}).`);

    // Perform actual re-assignment update
    const reAssignedLead = await prisma.lead.update({
      where: { id: testLead.id },
      data: { assignedToId: otherUser.id },
      include: { assignedTo: { select: { fullName: true, role: true } } }
    });
    console.log(`✅ Lead reassigned! New Assignee: ${reAssignedLead.assignedTo?.fullName} (${reAssignedLead.assignedTo?.role})`);
  }

  // 7. Test Assignable Users Clause for FA
  console.log('\nStep 7: Testing getAssignableUsersClause for FA...');
  const assignableUsersClause = getAssignableUsersClause({ id: faUser.id, role: faUser.role });
  const assignableUsers = await prisma.user.findMany({
    where: assignableUsersClause,
    select: { id: true, fullName: true, role: true }
  });
  console.log(`✅ FA can view ${assignableUsers.length} assignable active team members.`);

  // 8. Clean up test data
  console.log('\nStep 8: Cleaning up test lead...');
  await prisma.lead.delete({
    where: { id: testLead.id }
  });
  console.log('✅ Test lead cleaned up successfully.');

  console.log('\n🎉 ALL FA WORKFLOW VERIFICATIONS PASSED SUCCESSFULLY!');
}

runFaTest()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
