import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';

const normalizePhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
};

export const createWhatsAppLead = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    mobile,
    city,
    property_type,
    project_type,
    bhk_size,
    services_required,
    budget,
    timeline,
    floor_plan,
    design_style,
    consultation_required,
    meeting_type,
    preferred_date_time,
  } = req.body;

  if (!name || !mobile) {
    return apiResponse.error(res, 'Name and mobile (phone) are required', 400);
  }

  const normalizedPhone = normalizePhone(mobile);

  // 1. Get or create WhatsApp source
  const source = await prisma.source.upsert({
    where: { name: 'WhatsApp' },
    update: {},
    create: { name: 'WhatsApp' }
  });

  // 2. Get "Fresh" status
  const freshStatus = await prisma.leadStatus.findUnique({
    where: { name: 'Fresh' }
  });
  const statusId = freshStatus?.id || null;

  // 3. Try to find a matching project
  const matchedProject = await prisma.project.findFirst({
    where: {
      name: {
        contains: project_type || 'Interior Design',
        mode: 'insensitive'
      }
    }
  });
  const projectId = matchedProject?.id || null;

  // 4. Format questionnaire details
  const formattedComments = `--- WhatsApp Questionnaire Responses ---
👤 Name: ${name}
📍 City: ${city || '-'}
🏠 Property Type: ${property_type || '-'} (${bhk_size || '-'})
🔧 Project Type: ${project_type || '-'}
🎨 Services: ${services_required && Array.isArray(services_required) ? services_required.join(', ') : '-'}
💰 Budget: ${budget || '-'}
📅 Timeline: ${timeline || '-'}
🗺 Floor Plan: ${floor_plan || '-'}
✨ Design Style: ${design_style || '-'}
💬 Free Consultation: ${consultation_required || '-'}
📞 Meeting Preference: ${meeting_type || '-'}
🕒 Preferred Date/Time: ${preferred_date_time || '-'}`;

  const instruction = `WhatsApp Consultation: ${meeting_type || 'None'} requested on ${preferred_date_time || 'No date set'}`;

  // Get default admin creator
  const firstAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const createdById = firstAdmin?.id || 'system';

  // 5. Check for duplicate lead
  const existingLead = await prisma.lead.findFirst({
    where: {
      phone: {
        contains: normalizedPhone
      }
    }
  });

  if (existingLead) {
    // Log new activity under existing lead instead of erroring
    await prisma.leadActivity.create({
      data: {
        leadId: existingLead.id,
        type: 'NOTE',
        content: `New WhatsApp survey submitted:\n${formattedComments}`,
        userId: createdById || null
      }
    });

    return apiResponse.success(
      res, 
      existingLead, 
      `Existing lead matched (Lead ID: ${existingLead.leadId}). Recorded new inquiry in timeline activity.`, 
      200
    );
  }

  // 6. Create new lead
  const lead = await prisma.lead.create({
    data: {
      name,
      phone: normalizedPhone,
      sourceId: source.id,
      statusId,
      projectId,
      comments: formattedComments,
      instructionToPass: instruction,
      createdById,
      leadType: 'Direct Lead',
      rating: 4,
    },
    include: {
      status: true,
      source: true,
      project: true
    }
  });

  // Log Initial Activity
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: 'SYSTEM',
      content: `Lead captured via WhatsApp Chatbot flow`,
      userId: createdById || null
    }
  });

  return apiResponse.success(res, lead, 'WhatsApp Lead created successfully in CRM', 201);
});
