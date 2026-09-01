import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// High fidelity Indian names & sample data
const sampleNames = [
  'Vikram Malhotra', 'Sneha Kulkarni', 'Aditya Iyer', 'Pooja Hegde', 'Rohan Mehra',
  'Anjali Menon', 'Karthik Raman', 'Meera Nambiar', 'Sanjay Joshi', 'Divya Balakrishnan',
  'Gautam Singhania', 'Nandini Patel', 'Arvind Swaminathan', 'Shreya Deshmukh', 'Manoj Bajpai',
  'Priyanka Nambeesan', 'Harish Kalyan', 'Lavanya Sundar', 'Ashwin Saravanan', 'Keerthy Suresh',
  'Rajiv Gandhi', 'Swathi Varma', 'Manish Pandey', 'Ritika Sen', 'Naveen Polishetty',
  'Gayathri Raghuram', 'Kiran Bedi', 'Deepa Jayakumar', 'Varun Tej', 'Sowmya Reddy',
  'Pradeep Ranganathan', 'Shruti Haasan', 'Kishore Kumar', 'Archana Chandhoke', 'Siddharth Rao',
  'Malavika Mohanan', 'Tarun Tahiliani', 'Nithya Menen', 'Abhishek Bachchan', 'Trisha Krishnan',
  'Dhanush Raja', 'Sai Pallavi', 'Vijay Sethupathi', 'Nayanthara Kurian', 'Suriya Sivakumar',
  'Samantha Ruth', 'Karthi Sivakumar', 'Tamannaah Bhatia', 'Jayam Ravi', 'Aishwarya Lekshmi',
  'Arya Rajendran', 'Rakul Preet', 'Simbu Silambarasan', 'Andrea Jeremiah', 'Vishal Krishna',
  'Regina Cassandra', 'Sivakarthikeyan Doss', 'Aparna Balamurali', 'Jiiva Choudhary', 'Madonna Sebastian',
  'Atharvaa Murali', 'Raashi Khanna', 'Kalidas Jayaram', 'Priya Bhavani', 'Dulquer Salmaan',
  'Nazriya Nazim', 'Fahadh Faasil', 'Parvathy Thiruvothu', 'Tovino Thomas', 'Kalyani Priyadarshan',
  'Prithviraj Sukumaran', 'Aishwarya Rajesh', 'Nivin Pauly', 'Amala Paul', 'Asif Ali',
  'Nimisha Sajayan', 'Unni Mukundan', 'Honey Rose', 'Biju Menon', 'Mamta Mohandas',
  'Sreenath Bhasi', 'Samyuktha Menon', 'Roshan Mathew', 'Anna Ben', 'Shane Nigam',
  'Darshana Rajendran', 'Antony Varghese', 'Aiswarya Suresh', 'Arjun Ashokan', 'Aparna Das',
  'Basil Joseph', 'Grace Antony', 'Vinay Rai', 'Sunainaa Yella', 'Ashok Selvan',
  'Priya Anand', 'Harish Kalyan', 'Tanya Ravichandran', 'Gautham Karthik', 'Manjima Mohan'
];

const metaCampaigns = [
  { campaign: 'CAMP_OMR_LUXURY_VILLAS_2026', form: 'FORM_MODULAR_KITCHEN_OMR', ad: 'AD_VIDEO_TOUR_3BHK' },
  { campaign: 'CAMP_BANGALORE_SMART_INTERIORS', form: 'FORM_FULL_HOME_INTERIORS', ad: 'AD_CAROUSEL_WARDROBES' },
  { campaign: 'CAMP_CHENNAI_PREMIUM_KITCHENS', form: 'FORM_ITALIAN_FINISH_ESTIMATE', ad: 'AD_REEL_BEFORE_AFTER' },
  { campaign: 'CAMP_HYDERABAD_EXPANSION_LAUNCH', form: 'FORM_FREE_DESIGN_CONSULTATION', ad: 'AD_STATIC_PRICE_CALCULATOR' },
  { campaign: 'CAMP_COIMBATORE_NEW_SHOWROOM', form: 'FORM_WALKIN_OFFER_15OFF', ad: 'AD_STORY_SHOWROOM_INVITE' }
];

async function seed100Leads() {
  console.log('🚀 Starting generation of 10 leads for each of the 10 users (100 leads total)...');

  // 1. Fetch Master Data
  const [brands, projects, sources, statuses, stages, users] = await Promise.all([
    prisma.brand.findMany(),
    prisma.project.findMany(),
    prisma.source.findMany(),
    prisma.leadStatus.findMany(),
    prisma.stage.findMany(),
    prisma.user.findMany({ orderBy: { username: 'asc' } }),
  ]);

  if (users.length === 0) {
    console.error('❌ No users found in database! Please run reset-data.ts first.');
    return;
  }

  console.log(`📋 Master data loaded:
  - Users: ${users.length} (${users.map(u => `${u.username} [${u.role}]`).join(', ')})
  - Brands: ${brands.length}
  - Projects: ${projects.length}
  - Sources: ${sources.length}
  - Statuses: ${statuses.length}
  - Stages: ${stages.length}`);

  // Find or fallback master entries
  const defaultBrand = brands[0]?.id || null;
  const defaultProject = projects[0]?.id || null;
  const metaSource = sources.find(s => /meta|facebook|instagram|digital/i.test(s.name))?.id || sources[0]?.id || null;
  const defaultStage = stages[0]?.id || null;

  // Clean existing leads
  console.log('🧹 Cleaning existing leads & activities...');
  await prisma.leadActivity.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.showroomVisit.deleteMany({});
  await prisma.lead.deleteMany({});

  let nameIndex = 0;
  let totalCreatedLeads = 0;
  let totalCreatedActivities = 0;

  // Base phone prefix
  let phoneBase = 9840100000;

  const statusWeights = [
    { name: 'Fresh', weight: 3 },
    { name: 'Follow-up', weight: 3 },
    { name: 'Opportunities', weight: 2 },
    { name: 'Order Booked', weight: 1 },
    { name: 'Disqualified', weight: 1 }
  ];

  for (const user of users) {
    console.log(`\n👤 Seeding 10 leads assigned to: ${user.fullName} (@${user.username} - ${user.role})...`);
    const isDmTeam = user.role === 'DM_EXECUTIVE';

    for (let i = 1; i <= 10; i++) {
      const leadName = sampleNames[nameIndex % sampleNames.length] || `Client ${phoneBase}`;
      nameIndex++;
      phoneBase++;

      // Pick status
      const statusChoice = statusWeights[i % statusWeights.length];
      const matchedStatus = statuses.find(s => s.name.toLowerCase() === statusChoice.name.toLowerCase()) || statuses[i % statuses.length];
      const matchedBrand = brands[(i + nameIndex) % brands.length]?.id || defaultBrand;
      const matchedProject = projects[(i + nameIndex) % projects.length]?.id || defaultProject;
      const matchedStage = stages[(i + nameIndex) % stages.length]?.id || defaultStage;
      const matchedSource = isDmTeam ? metaSource : (sources[(i + nameIndex) % sources.length]?.id || sources[0]?.id || null);

      const rating = (i % 5) + 1;
      const daysAgo = (i * 3) % 25;
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const followUpDate = new Date(Date.now() + ((i % 5) - 2) * 24 * 60 * 60 * 1000);
      const contactableDate = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);

      // Meta Data for DM Executive team
      let metaLeadId: string | null = null;
      let metaFormId: string | null = null;
      let metaAdId: string | null = null;
      let metaCampaignId: string | null = null;
      let metaAdAccountId: string | null = null;

      if (isDmTeam || i <= 3) {
        const camp = metaCampaigns[(i + nameIndex) % metaCampaigns.length];
        metaLeadId = `META_LEAD_${Date.now().toString().slice(-6)}_${phoneBase.toString().slice(-4)}`;
        metaFormId = camp.form;
        metaAdId = `${camp.ad}_V${(i % 3) + 1}`;
        metaCampaignId = camp.campaign;
        metaAdAccountId = `ACT_9948201948_${user.username}`;
      }

      const emailUsername = leadName.toLowerCase().replace(/[^a-z]/g, '.');
      const email = `${emailUsername}.${phoneBase.toString().slice(-4)}@example.com`;

      const lead = await prisma.lead.create({
        data: {
          name: leadName,
          email,
          phone: phoneBase.toString(),
          brandId: matchedBrand,
          projectId: matchedProject,
          sourceId: matchedSource,
          statusId: matchedStatus?.id || null,
          currentStageId: matchedStage,
          rating,
          leadType: isDmTeam ? 'Meta Ad Lead' : 'Direct Inbound',
          instructionToPass: isDmTeam 
            ? `Client submitted Facebook Instant Lead Form for 3BHK premium modular interior design. Budget range: 12L-18L.` 
            : `Client interested in complete home interior solutions. Wants modular kitchen & 2 master wardrobes.`,
          comments: `Initial assessment completed for ${leadName}. Target move-in within 60 days.`,
          assignedToId: user.id,
          createdById: user.id,
          contactableDate,
          dataCollected: createdAt,
          nextFollowUp: followUpDate,
          createdAt,
          updatedAt: new Date(createdAt.getTime() + 12 * 60 * 60 * 1000),
          orderValue: matchedStatus?.name === 'Order Booked' ? 850000 + (i * 50000) : null,
          metaLeadId,
          metaFormId,
          metaAdId,
          metaCampaignId,
          metaAdAccountId,
        }
      });

      totalCreatedLeads++;

      // Create Activities for each lead
      // 1. Creation Audit Log
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'SYSTEM',
          content: isDmTeam 
            ? `Lead automatically captured via Meta Ad campaign (${metaCampaignId || 'Meta Ads'}) with Instant Form ID ${metaFormId || 'FORM_01'}`
            : `Lead registered into CRM by ${user.fullName} (${user.role})`,
          userId: user.id,
          createdAt,
        }
      });
      totalCreatedActivities++;

      // 2. Status Log
      if (matchedStatus) {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'STATUS_CHANGE',
            content: `Status updated to ${matchedStatus.name} by ${user.fullName}`,
            userId: user.id,
            createdAt: new Date(createdAt.getTime() + 1 * 60 * 60 * 1000),
          }
        });
        totalCreatedActivities++;
      }

      // 3. Assignment Log
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'ASSIGNMENT',
          content: `Assigned directly to ${user.fullName} (${user.role})`,
          userId: user.id,
          createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
        }
      });
      totalCreatedActivities++;

      // 4. Follow-up Call / Interaction Log
      const activityTypes = ['PHONE', 'NOTE', 'VISIT', 'EMAIL'];
      const actType = activityTypes[i % activityTypes.length];
      let content = '';

      if (actType === 'PHONE') {
        content = `Spoke with ${leadName}. Confirmed 3BHK layout measurements and agreed on site visit.`;
      } else if (actType === 'VISIT') {
        content = `Client visited showroom. Walkthrough of Acrylic and PU finish modular setups completed.`;
      } else if (actType === 'EMAIL') {
        content = `Sent introductory catalog, quotation split-up, and 3D concept renders to ${email}.`;
      } else {
        content = `Client expressed strong interest in German hardware fittings (Hafele / Hettich). Follow-up scheduled.`;
      }

      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: actType as any,
          content,
          userId: user.id,
          createdAt: new Date(createdAt.getTime() + 6 * 60 * 60 * 1000),
        }
      });
      totalCreatedActivities++;

      // 5. If Meta lead, log form answers
      if (metaLeadId) {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'NOTE',
            content: `📋 Meta Lead Ad Submission Answers:\n• Property Type: 3 BHK Apartment\n• Budget: ₹10L - ₹15L\n• Preferred City: Chennai / Bangalore\n• Expected Possession: Within 3 months\n• Ad ID: ${metaAdId}\n• Lead ID: ${metaLeadId}`,
            userId: user.id,
            createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
          }
        });
        totalCreatedActivities++;
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 SUCCESS! Seeded ${totalCreatedLeads} Leads & ${totalCreatedActivities} Activities!`);
  console.log(`- Total Users: ${users.length} (2 per role)`);
  console.log(`- Leads per User: 10`);
  console.log(`- Meta Lead details populated for DM Executive team`);
  console.log(`======================================================\n`);
}

seed100Leads()
  .catch(e => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
