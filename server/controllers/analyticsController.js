import {
  calculateGPA,
  calculateCumulativeGPA,
  predictFinalGrade,
  prioritizeAssignments,
  detectRisk,
  getPerformanceSummary,
} from '../utils/analytics.js';

import { Assignment } from '../models/assignments.js';

const getStudentAssignments = async (userId, course = null) => {
  const filter = { studentId: userId };
  if (course) filter.course = course;
  return Assignment.find(filter);
};

export const getGPA = async (req, res, next) => {
  try {
    const { course } = req.query;
    const assignments = await getStudentAssignments(req.user.userId, course);
    const result = calculateGPA(assignments);
    res.json({ course: course || 'all', ...result });
  } catch (error) {
    next(error);
  }
};

export const getCumulativeGPA = async (req, res, next) => {
  try {
    const studentAssignments = await getStudentAssignments(req.user.userId);
    const courseMap = {};
    studentAssignments.forEach((a) => {
      const key = a.course || 'Uncategorized';
      if (!courseMap[key]) courseMap[key] = [];
      courseMap[key].push(a);
    });
    const courses = Object.entries(courseMap).map(([courseName, assignments]) => ({ courseName, assignments }));
    const result = calculateCumulativeGPA(courses);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPrediction = async (req, res, next) => {
  try {
    const { course } = req.query;
    if (!course) return res.status(400).json({ error: 'course query parameter is required' });
    const assignments = await getStudentAssignments(req.user.userId, course);
    if (assignments.length === 0) return res.status(404).json({ error: 'No assignments found for this course' });
    const result = predictFinalGrade(assignments);
    res.json({ course, ...result });
  } catch (error) {
    next(error);
  }
};

export const getPriorityList = async (req, res, next) => {
  try {
    const assignments = await getStudentAssignments(req.user.userId);
    const prioritized = prioritizeAssignments(assignments);
    res.json(prioritized);
  } catch (error) {
    next(error);
  }
};

export const getRiskAssessment = async (req, res, next) => {
  try {
    const { course } = req.query;
    const assignments = await getStudentAssignments(req.user.userId, course);
    if (assignments.length === 0) {
      return res.json({ riskLevel: 'NONE', alerts: [], recommendations: ['Add assignments to track your progress.'], currentGrade: 0, predictedGrade: 0 });
    }
    const result = detectRisk(assignments);
    res.json({ course: course || 'all', ...result });
  } catch (error) {
    next(error);
  }
};

export const getPerformanceTrends = async (req, res, next) => {
  try {
    const { course, window } = req.query;
    const windowSize = parseInt(window) || 3;
    const assignments = await getStudentAssignments(req.user.userId, course);
    const result = getPerformanceSummary(assignments, windowSize);
    res.json({ course: course || 'all', ...result });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const studentAssignments = await getStudentAssignments(req.user.userId);
    const courseMap = {};
    studentAssignments.forEach((a) => {
      const key = a.course || 'Uncategorized';
      if (!courseMap[key]) courseMap[key] = [];
      courseMap[key].push(a);
    });

    const courses = Object.entries(courseMap).map(([courseName, assignments]) => ({
      courseName,
      gpa: calculateGPA(assignments),
      prediction: predictFinalGrade(assignments),
      risk: detectRisk(assignments),
      trends: getPerformanceSummary(assignments),
    }));

    const cumulativeGPA = calculateCumulativeGPA(
      courses.map((c) => ({ courseName: c.courseName, assignments: courseMap[c.courseName] }))
    );

    const priorityList = prioritizeAssignments(studentAssignments).slice(0, 5);

    res.json({
      cumulativeGPA,
      courses,
      upcomingPriority: priorityList,
      totalAssignments: studentAssignments.length,
      completedAssignments: studentAssignments.filter((a) => a.status === 'completed').length,
    });
  } catch (error) {
    next(error);
  }
};
