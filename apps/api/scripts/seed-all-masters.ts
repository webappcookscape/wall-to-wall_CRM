import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function seedAllMasters() {
  console.log('🚀 Seeding comprehensive Master Data for Wall to Wall CRM into PostgreSQL...');

  // 1. Showrooms
  const showrooms = [
    { name: 'Chennai - OMR Experience Centre', location: 'OMR, Chennai' },
    { name: 'Chennai - Nandhanam Design Studio', location: 'Nandhanam, Chennai' },
    { name: 'Bangalore - HSR Layout Hub', location: 'HSR Layout, Bangalore' },
    { name: 'Chennai - Porur Branch', location: 'Porur, Chennai' },
    { name: 'Coimbatore - Covai Showroom', location: 'Race Course, Coimbatore' },
  ];
  for (const item of showrooms) {
    await prisma.showroom.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Showrooms seeded (${showrooms.length})`);

  // 2. Brands
  const brands = [
    { name: 'Wall to Wall', logo: '/assets/logos/Wall-to-wall_logo.jpeg' }
  ];
  for (const item of brands) {
    await prisma.brand.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Brands seeded (${brands.length})`);

  // 3. Stages
  const stages = [
    { name: 'Initial Contact & Lead Discovery' },
    { name: 'Client signature on freezing advance receipt' },
    { name: 'Booking confirmation email sent' },
    { name: 'Site FM (Final Measurement) & PDI' },
    { name: 'Send 2D Drawings for FM' },
    { name: 'FM taken - Attach CAD drawings' },
    { name: 'PDI Report + site photos shared with client' },
    { name: '2D Drawings as per FM sent to client' },
    { name: 'Get Final Design Approval from Client' },
    { name: 'Invite to showroom / Fix Material & Color selection' },
    { name: 'Do 3D Renders & Color Scheme to Client' },
    { name: 'Payment Split-up & Production Advance' },
    { name: 'Loading Finalized Order Step' },
    { name: 'Factory Production in Progress' },
    { name: 'Site Installation Ongoing' },
    { name: 'Final Handover & Client Sign-off' },
  ];
  for (const item of stages) {
    await prisma.stage.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Stages seeded (${stages.length})`);

  // 4. Sources
  const sources = [
    { name: 'Meta Ads (Facebook & Instagram)' },
    { name: 'Google Search & Performance Max' },
    { name: 'Architect & Interior Referral' },
    { name: 'Walk-in Customer' },
    { name: 'Official Website Enquiry' },
    { name: 'Instagram Direct Message' },
    { name: 'Direct Client Call' },
    { name: 'Real Estate Builder Channel' }
  ];
  for (const item of sources) {
    await prisma.source.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Sources seeded (${sources.length})`);

  // 5. Projects
  const projects = [
    { name: 'Modular Kitchen' },
    { name: 'Full Home Interior' },
    { name: 'Wardrobe & Storage' },
    { name: 'False Ceiling & Cove Lighting' },
    { name: 'Designer Wallpaper' },
    { name: 'Wall Murals & Textures' },
    { name: 'Acoustic & Wooden Wall Cladding' },
    { name: 'Wall Painting & Premium Finishes' },
    { name: 'Motorized Blinds & Drapery' },
    { name: 'Living Room TV Unit & Paneling' },
    { name: 'Bathroom Vanity & Partitions' },
    { name: 'Wall2Wall Heights Luxury 3BHK' },
    { name: 'Wall2Wall Valley Villas' },
    { name: 'Wall2Wall Gardens Penthouse' }
  ];
  for (const item of projects) {
    await prisma.project.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Projects seeded (${projects.length})`);

  // 6. Lead Statuses
  const statuses = [
    { name: 'Fresh' },
    { name: 'Follow-up' },
    { name: 'Yet To Follow-up' },
    { name: 'Opportunities' },
    { name: 'Order Booked' },
    { name: 'Disqualified' },
    { name: 'Design Completed' }
  ];
  for (const item of statuses) {
    await prisma.leadStatus.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Lead Statuses seeded (${statuses.length})`);

  // 7. Salutations
  const salutations = [
    { name: 'Mr.' },
    { name: 'Ms.' },
    { name: 'Mrs.' },
    { name: 'Dr.' },
    { name: 'Ar.' }
  ];
  for (const item of salutations) {
    await prisma.salutation.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Salutations seeded (${salutations.length})`);

  // 8. Lead Tags
  const tags = [
    { name: 'High Priority (VIP)' },
    { name: 'Ready Possession' },
    { name: 'Under Construction' },
    { name: 'Luxury Villa' },
    { name: 'Budget Friendly' },
    { name: 'Immediate Requirement' },
    { name: 'Architect Referred' },
    { name: 'Modular Kitchen Only' }
  ];
  for (const item of tags) {
    await prisma.leadTag.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Lead Tags seeded (${tags.length})`);

  // 9. Bank Details
  const bankDetails = [
    {
      bankName: 'HDFC Bank',
      accountNumber: '50200088991122',
      branch: 'OMR, Chennai',
      accountHolderName: 'Wall to Wall Interior Solutions Pvt Ltd'
    },
    {
      bankName: 'ICICI Bank',
      accountNumber: '001105012345',
      branch: 'Nandhanam, Chennai',
      accountHolderName: 'Wall to Wall Interior Solutions Pvt Ltd'
    }
  ];
  for (const item of bankDetails) {
    await prisma.bankDetail.upsert({
      where: { accountNumber: item.accountNumber },
      update: item,
      create: item
    });
  }
  console.log(`✅ Bank Details seeded (${bankDetails.length})`);

  // 10. Scope of Work
  const scopes = [
    { name: 'Civil & Tile Work' },
    { name: 'Modular Woodwork & Carcase' },
    { name: 'Electrical & Smart Automation' },
    { name: 'False Ceiling & Painting' },
    { name: 'Soft Furnishings & Blinds' },
    { name: 'Turnkey End-to-End Handover' }
  ];
  for (const item of scopes) {
    await prisma.scopeOfWork.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Scopes of Work seeded (${scopes.length})`);

  // 11. Payment Modes
  const paymentModes = [
    { name: 'NEFT / RTGS Bank Transfer' },
    { name: 'UPI / GPay / PhonePe' },
    { name: 'Credit / Debit Card' },
    { name: 'Account Payee Cheque' },
    { name: 'Cash Deposit' }
  ];
  for (const item of paymentModes) {
    await prisma.paymentMode.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Payment Modes seeded (${paymentModes.length})`);

  // 12. Split Ups
  const splitUps = [
    { name: '10% Booking Advance' },
    { name: '40% Production Approval' },
    { name: '40% Material Dispatch' },
    { name: '10% Final Handover' },
    { name: '100% Full Advance' }
  ];
  for (const item of splitUps) {
    await prisma.splitUp.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Split Ups seeded (${splitUps.length})`);

  // 13. Activity Types
  const activityTypes = [
    { name: 'PHONE' },
    { name: 'EMAIL' },
    { name: 'SMS' },
    { name: 'MEETING' },
    { name: 'SHOWROOM_VISIT' },
    { name: 'STATUS_CHANGE' },
    { name: 'ASSIGNMENT' },
    { name: 'NOTE' }
  ];
  for (const item of activityTypes) {
    await prisma.activityType.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Activity Types seeded (${activityTypes.length})`);

  // 14. Vendor Sources
  const vendorSources = [
    { name: 'Direct Factory In-House' },
    { name: 'Hafele Hardware India' },
    { name: 'Hettich Hardware' },
    { name: 'Blum Austria' },
    { name: 'Saint-Gobain Glass & Mirrors' },
    { name: 'CenturyPly / Greenlam Laminates' },
    { name: 'Asian Paints Royale Finishes' }
  ];
  for (const item of vendorSources) {
    await prisma.vendorSource.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Vendor Sources seeded (${vendorSources.length})`);

  // 15. Production Holds
  const productionHolds = [
    { name: 'Awaiting Client Drawing Approval' },
    { name: 'Site Not Ready / Civil Work Pending' },
    { name: 'Awaiting Material & Shade Finalization' },
    { name: 'Payment Milestone Confirmation Pending' },
    { name: 'Special Hardware On Backorder' },
    { name: 'Client Requested Delay' }
  ];
  for (const item of productionHolds) {
    await prisma.productionHold.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Production Holds seeded (${productionHolds.length})`);

  // 16. Work Notifications
  const workNotifications = [
    { name: 'Site Final Measurement Scheduled' },
    { name: '2D & 3D Renderings Sent to Client' },
    { name: 'Client Design Approval Received' },
    { name: 'Production Order Placed at Factory' },
    { name: 'Material Dispatched to Client Site' },
    { name: 'Installation Team Mobilized' },
    { name: 'Snagging & Quality Check Complete' },
    { name: 'Key Handover & Project Signoff' }
  ];
  for (const item of workNotifications) {
    await prisma.workNotification.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Work Notifications seeded (${workNotifications.length})`);

  // 17. SMS Templates
  const smsTemplates = [
    {
      name: 'Welcome & Consultation Scheduled',
      content: 'Dear {name}, thank you for choosing Wall to Wall Interiors! Your design consultation is scheduled on {date}. Call us at +91 9840011001 for any queries.'
    },
    {
      name: 'Showroom Visit Reminder',
      content: 'Hello {name}, we look forward to hosting you at Wall to Wall Experience Centre on {date}. Directions: https://maps.wall2wall.com'
    },
    {
      name: 'Design Proposal Ready',
      content: 'Dear {name}, your custom 3D home interior proposal is ready for review! Check your email or login to view drawings.'
    },
    {
      name: 'Payment Receipt Confirmation',
      content: 'Dear {name}, we have received your payment of Rs. {amount} towards your interior project. Thank you! - Wall to Wall CRM'
    }
  ];
  for (const item of smsTemplates) {
    await prisma.smsTemplate.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ SMS Templates seeded (${smsTemplates.length})`);

  // 18. Email Templates
  const emailTemplates = [
    {
      name: 'Welcome to Wall to Wall Interiors',
      subject: 'Welcome to Wall to Wall — Your Dream Home Interior Journey Begins',
      content: '<p>Dear {name},</p><p>Thank you for connecting with Wall to Wall Interiors. Our dedicated design consultant has been assigned to your project and will reach out shortly to review your floor plan and interior preferences.</p><p>Warm regards,<br>Team Wall to Wall</p>'
    },
    {
      name: '3D Design Proposal & Estimation',
      subject: 'Your Customized 3D Interior Design & Quotation from Wall to Wall',
      content: '<p>Dear {name},</p><p>We are delighted to share the initial 3D visualization and itemized scope of work for your home project. Please find the attached drawings and quotation.</p><p>Feel free to schedule a walkthrough with our design head.</p>'
    }
  ];
  for (const item of emailTemplates) {
    await prisma.emailTemplate.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✅ Email Templates seeded (${emailTemplates.length})`);

  console.log('\n🔄 Extracting updated state into extracted-seed-data.json...');
  const extractScript = path.join(currentDir, 'extract-to-seed.ts');
  const { execSync } = await import('child_process');
  execSync(`npx tsx "${extractScript}"`, { stdio: 'inherit' });

  console.log('\n🎉 ALL MASTER DATA SEEDED SUCCESSFULLY!');
}

seedAllMasters()
  .catch(e => {
    console.error('❌ Error seeding master data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
