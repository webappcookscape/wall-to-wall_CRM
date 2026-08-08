import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getPhotos, uploadPhoto, deletePhoto } from '../controllers/photos.controller.js';

const router = Router();

// Configure multer for storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signatures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.get('/', getPhotos as any);
router.post('/', upload.single('photo') as any, uploadPhoto as any);
router.delete('/:id', deletePhoto as any);

export default router;
