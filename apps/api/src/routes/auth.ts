import express from 'express';
import { login, getMe, googleLogin } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { loginSchema, googleLoginSchema } from '../schemas/auth.schema.js';

const router = express.Router();

router.post('/login', validate(loginSchema), login);
router.post('/google-login', validate(googleLoginSchema), googleLogin);
router.get('/me', getMe);

export default router;
