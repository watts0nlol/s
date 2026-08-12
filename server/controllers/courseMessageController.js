import { Course } from '../models/courses.js';
import { CourseMessage } from '../models/courseMessages.js';
import { canAccessCourse } from '../utils/courseAccess.js';
import { publicCourseMessage } from '../utils/courseMessages.js';

export const listCourseMessages = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId).lean();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!canAccessCourse(course, req.user)) return res.status(403).json({ error: 'Access denied' });
    const messages = await CourseMessage.find({ courseId: String(course._id) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(messages.reverse().map(publicCourseMessage));
  } catch (error) {
    next(error);
  }
};
