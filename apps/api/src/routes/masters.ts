import { Router } from 'express';
import { getMasters, getMasterByType, createMaster, updateMaster, deleteMaster } from '../controllers/masters.controller.js';

const router = Router();

router.get('/', getMasters);
router.get('/:type', getMasterByType as any);
router.post('/', createMaster);
router.put('/:type/:id', updateMaster);
router.delete('/:type/:id', deleteMaster);

export default router;
