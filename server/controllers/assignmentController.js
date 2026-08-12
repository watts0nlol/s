import { Assignment } from '../models/assignments.js';
import { Course } from '../models/courses.js';
import { canAccessCourse } from '../utils/courseAccess.js';
import { validateAssignment } from '../utils/validation.js';

const resolveLinkedCourse = async (courseId, user, studentId = null) => {
  if (!courseId) return null;
  const course = await Course.findById(courseId).lean();
  if (!course) {
    const error = new Error('Course not found');
    error.statusCode = 404;
    throw error;
  }
  if (!canAccessCourse(course, user)) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }
  if (studentId && user.role !== 'student' && !course.studentIds?.some((id) => String(id) === String(studentId))) {
    const error = new Error('Student is not enrolled in this course');
    error.statusCode = 400;
    throw error;
  }
  return course;
};

export const listAssignments = async (req, res, next) => {
  try {
    const user = req.user;
    const filter = user.role === 'student' ? { studentId: user.userId } : {};
    const assignments = await Assignment.find(filter).sort({ dueDate: 1 }).lean();
    res.json(assignments);
  } catch (error) {
    next(error);
  }
};

export const getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).lean();
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (req.user.role === 'student' && assignment.studentId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(assignment);
  } catch (error) {
    next(error);
  }
};

export const createAssignment = async (req, res, next) => {
  try {
    const input = { ...req.body };
    if (req.user.role === 'student') delete input.studentId;
    const { errors, value } = validateAssignment(input);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const { title, description, dueDate, grade, weight, courseId } = value;
    const isStudent = req.user.role === 'student';
    const studentId = isStudent ? req.user.userId : value.studentId;

    if (!isStudent && courseId) {
      const linkedCourse = await resolveLinkedCourse(courseId, req.user);
      const enrolledStudentIds = [...new Set((linkedCourse.studentIds || []).map(String).filter(Boolean))];
      if (enrolledStudentIds.length === 0) {
        return res.status(400).json({ error: 'Course has no enrolled students' });
      }

      const duplicate = await Assignment.findOne({
        courseId: String(linkedCourse._id),
        createdBy: req.user.userId,
        title,
        dueDate,
      }).lean();
      if (duplicate) {
        return res.status(409).json({ error: 'This assignment has already been distributed to the course' });
      }

      const assignments = await Assignment.insertMany(enrolledStudentIds.map((enrolledStudentId) => ({
        title,
        description: description || '',
        studentId: enrolledStudentId,
        dueDate,
        createdBy: req.user.userId,
        status: 'assigned',
        grade,
        weight,
        course: linkedCourse.code,
        courseId: String(linkedCourse._id),
      })));
      return res.status(201).json({ assignments, count: assignments.length });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'title, studentId, and dueDate are required' });
    }

    const linkedCourse = await resolveLinkedCourse(courseId, req.user, studentId);
    const course = linkedCourse ? linkedCourse.code : value.course;
    const assignment = await Assignment.create({
      title,
      description: description || '',
      studentId,
      dueDate,
      createdBy: req.user.userId,
      status: 'assigned',
      grade,
      weight,
      course,
      courseId: linkedCourse ? String(linkedCourse._id) : null,
    });

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

export const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const { errors, value } = validateAssignment(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const { title, description, dueDate, status, grade, weight } = value;
    let course = value.course;
    let courseId = value.courseId;
    if (courseId) {
      const linkedCourse = await resolveLinkedCourse(courseId, req.user, assignment.studentId);
      course = linkedCourse.code;
      courseId = String(linkedCourse._id);
    }

    if (title !== undefined)       assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined)     assignment.dueDate = dueDate;
    if (status !== undefined)      assignment.status = status;
    if (grade !== undefined)       assignment.grade = grade;
    if (weight !== undefined)      assignment.weight = weight;
    if (course !== undefined)      assignment.course = course;
    if (courseId !== undefined)    assignment.courseId = courseId;

    await assignment.save();
    res.json(assignment);
  } catch (error) {
    next(error);
  }
};

export const updateAssignmentStatus = async (req, res, next) => {
  try {
    const fields = Object.keys(req.body || {});
    if (fields.length !== 1 || fields[0] !== 'status') {
      return res.status(400).json({ error: 'Only the status field may be updated through this route' });
    }

    const { errors, value } = validateAssignment(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (req.user.role === 'student' && assignment.studentId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!['student', 'teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    assignment.status = value.status;
    await assignment.save();
    res.json(assignment);
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ deleted: assignment });
  } catch (error) {
    next(error);
  }
};
