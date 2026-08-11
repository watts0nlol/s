import crypto from 'node:crypto';
import { Course } from '../models/courses.js';
import { User } from '../models/users.js';
import { canAccessCourse, publicCourse } from '../utils/courseAccess.js';
import { validateCourse, validateJoinCode } from '../utils/validation.js';

const createJoinCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...crypto.randomBytes(8)].map((byte) => alphabet[byte % alphabet.length]).join('');
};

export const listCourses = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'student') filter = { studentIds: req.user.userId, active: true };
    if (req.user.role === 'teacher') filter = { teacherId: req.user.userId };
    const courses = await Course.find(filter).sort({ code: 1 }).lean();
    res.json(courses.map((course) => publicCourse(course, req.user)));
  } catch (error) { next(error); }
};

export const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!canAccessCourse(course, req.user)) return res.status(403).json({ error: 'Access denied' });
    res.json(publicCourse(course, req.user));
  } catch (error) { next(error); }
};

export const createCourse = async (req, res, next) => {
  try {
    const { errors, value } = validateCourse(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const teacherId = req.user.role === 'teacher' ? req.user.userId : (value.teacherId || req.user.userId);
    if (req.user.role === 'admin' && value.teacherId) {
      const teacher = await User.findOne({ _id: value.teacherId, role: 'teacher' }).lean();
      if (!teacher) return res.status(400).json({ error: 'Teacher account not found' });
    }
    let course;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        course = await Course.create({ name: value.name, code: value.code, teacherId, joinCode: createJoinCode(), studentIds: [] });
        break;
      } catch (error) {
        if (error?.code !== 11000 || attempt === 4) throw error;
      }
    }
    res.status(201).json(publicCourse(course, req.user));
  } catch (error) { next(error); }
};

export const joinCourse = async (req, res, next) => {
  try {
    const { errors, value } = validateJoinCode(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const course = await Course.findOneAndUpdate(
      { joinCode: value.joinCode, active: true },
      { $addToSet: { studentIds: req.user.userId } },
      { new: true }
    );
    if (!course) return res.status(404).json({ error: 'Active course not found for that join code' });
    res.json(publicCourse(course, req.user));
  } catch (error) { next(error); }
};
