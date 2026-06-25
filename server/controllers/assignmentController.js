import { Assignment } from '../models/assignments.js';

export const listAssignments = async (req, res, next) => {
  try {
    const user = req.user;
    const filter = user.role === 'student' ? { studentId: user.userId } : {};
    const assignments = await Assignment.find(filter).sort({ dueDate: 1 });
    res.json(assignments);
  } catch (error) {
    next(error);
  }
};

export const getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
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
    const { title, description, studentId, dueDate, grade, weight, course } = req.body;

    if (!title || !studentId || !dueDate) {
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

    const { title, description, dueDate, status, grade, weight, course } = req.body;

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
