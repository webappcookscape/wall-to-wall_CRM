import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';


export const getPhotos = asyncHandler(async (req: Request, res: Response) => {
  const photos = await prisma.signaturePhoto.findMany({
    orderBy: { createdAt: 'desc' }
  });
  apiResponse.success(res, photos);
});

export const uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return apiResponse.error(res, 'No file uploaded', 400);
  }

  const photo = await prisma.signaturePhoto.create({
    data: {
      name: req.file.originalname,
      path: `/uploads/signatures/${req.file.filename}`
    }
  });

  apiResponse.success(res, photo, 'Photo uploaded successfully', 201);
});

export const deletePhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const photo = await prisma.signaturePhoto.findUnique({
    where: { id: id as string }
  });

  if (!photo) {
    return apiResponse.error(res, 'Photo not found', 404);
  }

  // Delete file from disk
  const filePath = path.join(process.cwd(), 'public', photo.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.signaturePhoto.delete({
    where: { id: id as string }
  });

  apiResponse.success(res, null, 'Photo deleted successfully', 204);
});
