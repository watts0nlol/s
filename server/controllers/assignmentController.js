import { Assignment } from '../models/assignments.js';
import { validateAssignment } from '../utils/validation.js';

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

    const { title, description, dueDate, grade, weight, course } = value;
    const studentId = req.user.role === 'student' ? req.user.userId : value.studentId;

    if (!studentId) {
      return res.status(400).json({ error: 'title, studentId, and dueDate are required' });
    }

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
    const { title, description, dueDate, status, grade, weight, course } = value;

    if (title !== undefined)       assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined)     assignment.dueDate = dueDate;
    if (status !== undefined)      assignment.status = status;
    if (grade !== undefined)       assignment.grade = grade;
    if (weight !== undefined)      assignment.weight = weight;
    if (course !== undefined)      assignment.course = course;

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
