import { Announcement } from '../models/announcements.js';
import { Course } from '../models/courses.js';
import { canAccessCourse, canManageCourse } from '../utils/courseAccess.js';
import { validateAnnouncement } from '../utils/validation.js';

export const listCourseAnnouncements = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId).lean();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!canAccessCourse(course, req.user)) return res.status(403).json({ error: 'Access denied' });
    const announcements = await Announcement.find({ courseId: String(course._id) }).sort({ createdAt: -1 }).lean();
    res.json(announcements);
  } catch (error) { next(error); }
};

export const createCourseAnnouncement = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId).lean();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!canManageCourse(course, req.user)) return res.status(403).json({ error: 'Access denied' });
    const { errors, value } = validateAnnouncement(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const announcement = await Announcement.create({ courseId: String(course._id), message: value.message, createdBy: req.user.userId });
    res.status(201).json(announcement);
  } catch (error) { next(error); }
};

export const listAccessibleAnnouncements = async (req, res, next) => {
  try {
    let courseFilter = {};
    if (req.user.role === 'student') courseFilter = { studentIds: req.user.userId, active: true };
    if (req.user.role === 'teacher') courseFilter = { teacherId: req.user.userId };
    const courses = await Course.find(courseFilter, '_id').lean();
    const ids = courses.map((course) => String(course._id));
    const announcements = await Announcement.find({ courseId: { $in: ids } }).sort({ createdAt: -1 }).lean();
    res.json(announcements);
  } catch (error) { next(error); }
};
