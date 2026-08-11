import express from 'express';
import { createCourseAnnouncement, listAccessibleAnnouncements, listCourseAnnouncements } from '../controllers/announcementController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);
router.get('/', listAccessibleAnnouncements);
router.get('/course/:courseId', listCourseAnnouncements);
router.post('/course/:courseId', createCourseAnnouncement);

export default router;
