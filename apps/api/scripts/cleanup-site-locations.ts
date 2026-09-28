import prisma from '../src/lib/prisma.js';

/**
 * Migration & Cleanup script to extract legacy "Location: ..." from comments
 * and populate the dedicated `siteLocation` column, ensuring follow-up messages
 * are not merged into siteLocation.
 */
async function cleanupSiteLocations() {
  console.log('--- Starting Site Location & Comments Data Cleanup ---');
  
  const leads = await prisma.lead.findMany({
    where: {
      comments: { contains: 'Location:' }
    },
    select: {
      id: true,
      comments: true,
      siteLocation: true,
    }
  });

  console.log(`Found ${leads.length} leads with 'Location:' in comments.`);

  let updatedCount = 0;

  for (const lead of leads) {
    if (!lead.comments) continue;

    const locMatch = lead.comments.match(/Location:\s*([^|\n]+)/i);
    if (!locMatch) continue;

    const fullLoc = locMatch[1].trim();
    let siteLoc = lead.siteLocation || null;
    let followUpRemainder = '';

    if (fullLoc.includes('/')) {
      const parts = fullLoc.split(/\s*\/\s*/);
      siteLoc = siteLoc || parts[0]?.trim() || null;
      followUpRemainder = parts.slice(1).join(' / ').trim();
    } else {
      siteLoc = siteLoc || fullLoc || null;
    }

    // Strip "Location: ..." and preserve any remainder follow-up comments
    const cleanComments = lead.comments
      .replace(locMatch[0], followUpRemainder ? ` | ${followUpRemainder}` : '')
      .replace(/^(\s*\|\s*|\s*\/\s*)+|(\s*\|\s*|\s*\/\s*)+$/g, '')
      .trim() || null;

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        siteLocation: siteLoc,
        comments: cleanComments,
      }
    });

    updatedCount++;
  }

  console.log(`Successfully migrated and cleaned ${updatedCount} leads.`);
}

cleanupSiteLocations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
