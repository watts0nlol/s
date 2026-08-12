import express from 'express';
import { listCourseMessages } from '../controllers/courseMessageController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);
router.get('/:courseId', listCourseMessages);

export default router;
