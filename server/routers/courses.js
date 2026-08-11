import express from 'express';
import { createCourse, getCourse, joinCourse, listCourses } from '../controllers/courseController.js';
import { requireRole, verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);
router.get('/', listCourses);
router.post('/', requireRole('teacher', 'admin'), createCourse);
router.post('/join', requireRole('student'), joinCourse);
router.get('/:id', getCourse);

export default router;
