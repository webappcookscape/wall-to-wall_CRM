import prisma from '../lib/prisma.js';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';
import { getAssignableUsersClause, getRequestUser } from '../utils/leadAccess.js';


// Whitelist of models that can be managed via master CRUD
const VALID_MASTER_MODELS = [
  'showroom', 'source', 'project', 'leadStatus', 'salutation', 
  'leadTag', 'brand', 'stage', 'splitUp', 'activityType', 
  'vendorSource', 'productionHold', 'workNotification',
  'onlineQuestionCategory', 'onlineQuestion', 'bankDetail',
  'scopeOfWork', 'paymentMode', 'smsTemplate', 'emailTemplate'
];

const validateModel = (type: string) => {
  if (!VALID_MASTER_MODELS.includes(type)) {
    throw { status: 400, message: `Invalid master type: ${type}` };
  }
  return (prisma as any)[type];
};

export const getMasters = asyncHandler(async (req, res) => {
  const currentUser = getRequestUser(req);
  const models = {
    showrooms: prisma.showroom,
    sources: prisma.source,
    projects: prisma.project,
    statuses: prisma.leadStatus,
    salutations: prisma.salutation,
    leadTags: prisma.leadTag,
    brands: prisma.brand,
    stages: prisma.stage,
    users: prisma.user,
    splitUps: prisma.splitUp,
    activityTypes: prisma.activityType,
    vendorSources: prisma.vendorSource,
    productionHolds: prisma.productionHold,
    workNotifications: prisma.workNotification,
    bankDetails: prisma.bankDetail,
    scopeOfWorks: prisma.scopeOfWork,
    paymentModes: prisma.paymentMode,
    smsTemplates: prisma.smsTemplate,
    emailTemplates: prisma.emailTemplate
  };

  const results: any = {};
  const queries = Object.entries(models).map(async ([key, model]) => {
    if (!model) {
      results[key] = [];
      return;
    }

    if (key === 'users') {
      results[key] = await (model as any).findMany({
        where: getAssignableUsersClause(currentUser),
        select: { id: true, fullName: true, role: true }
      });
    } else if (key === 'bankDetails') {
      results[key] = await (model as any).findMany({ orderBy: { bankName: 'asc' } });
    } else if (key === 'smsTemplates' || key === 'emailTemplates') {
      results[key] = await (model as any).findMany({ orderBy: { name: 'asc' } });
    } else {
      results[key] = await (model as any).findMany({ orderBy: { name: 'asc' } });
    }
  });

  await Promise.all(queries);
  apiResponse.success(res, results);
});

export const getMasterByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const model = validateModel(String(type));
  const results = await model.findMany({ orderBy: { name: 'asc' } });
  apiResponse.success(res, results);
});

export const createMaster = asyncHandler(async (req, res) => {
    const { type, name, ...otherData } = req.body;
    const model = validateModel(String(type));
    const result = await model.create({ data: { ...(name ? { name } : {}), ...otherData } });
    apiResponse.success(res, result, 'Master created successfully', 201);
});

export const updateMaster = asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { name, ...otherData } = req.body;
    const model = validateModel(String(type));
    const result = await model.update({
        where: { id: String(id) },
        data: { ...(name ? { name } : {}), ...otherData }
    });
    apiResponse.success(res, result, 'Master updated successfully');
});

export const deleteMaster = asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const model = validateModel(String(type));
    await model.delete({ where: { id: String(id) } });
    apiResponse.success(res, null, 'Master deleted successfully', 204);
});
