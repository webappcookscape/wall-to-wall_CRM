import express from 'express';
import { 
  getLeads, 
  updateLead, 
  assignLead, 
  createLead, 
  getContactableCounts, 
  getLead, 
  addActivity, 
  bulkAssignLeads, 
  bulkImportLeads,
  getAllActivities, 
  deleteLead 
} from '../controllers/leads.controller.js';

const router = express.Router();

router.post('/list', getLeads);
router.post('/', createLead);
router.post('/import', bulkImportLeads);
router.get('/contactable-counts', getContactableCounts);
router.get('/:id', getLead);
router.delete('/:id', deleteLead);
router.put('/:id', updateLead);
router.put('/:id/assign', assignLead);
router.post('/bulk-assign', bulkAssignLeads);
router.post('/:id/activities', addActivity);
router.post('/activities', getAllActivities);

export default router;
