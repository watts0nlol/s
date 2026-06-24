// server/controllers/analyticsController.js

import {
  calculateGPA,
  calculateCumulativeGPA,
  predictFinalGrade,
  prioritizeAssignments,
  detectRisk,
  getPerformanceSummary,
} from '../utils/analytics.js';

import { assignments as allAssignments } from '../models/assignments.js';

// get assignments for a specific student + optional course
const getStudentAssignments = (userId, course = null) => {
  let filtered = allAssignments.filter((a) => a.studentId === userId);
  if (course) filtered = filtered.filter((a) => a.course === course);
  return filtered;
};

// GET /api/analytics/gpa
export const getGPA = (req, res) => {
  const { course } = req.query;
  const assignments = getStudentAssignments(req.user.userId, course);
  const result = calculateGPA(assignments);
  res.json({ course: course || 'all', ...result });
};

// GET /api/analytics/gpa/cumulative
export const getCumulativeGPA = (req, res) => {
  const studentAssignments = getStudentAssignments(req.user.userId);
  const courseMap = {};
  studentAssignments.forEach((a) => {
    const key = a.course || 'Uncategorized';
    if (!courseMap[key]) courseMap[key] = [];
    courseMap[key].push(a);
  });
  const courses = Object.entries(courseMap).map(([courseName, assignments]) => ({ courseName, assignments }));
  const result = calculateCumulativeGPA(courses);
  res.json(result);
};

// GET /api/analytics/predict?course=CPAN212
export const getPrediction = (req, res) => {
  const { course } = req.query;
  if (!course) return res.status(400).json({ error: 'course query parameter is required' });
  const assignments = getStudentAssignments(req.user.userId, course);
  if (assignments.length === 0) return res.status(404).json({ error: 'No assignments found for this course' });
  const result = predictFinalGrade(assignments);
  res.json({ course, ...result });
};

// GET /api/analytics/priority
export const getPriorityList = (req, res) => {
  const assignments = getStudentAssignments(req.user.userId);
  const prioritized = prioritizeAssignments(assignments);
  res.json(prioritized);
};

// GET /api/analytics/risk?course=CPAN212
export const getRiskAssessment = (req, res) => {
  const { course } = req.query;
  const assignments = getStudentAssignments(req.user.userId, course);
  if (assignments.length === 0) {
    return res.json({ riskLevel: 'NONE', alerts: [], recommendations: ['Add assignments to track your progress.'], currentGrade: 0, predictedGrade: 0 });
  }
  const result = detectRisk(assignments);
  res.json({ course: course || 'all', ...result });
};

// GET /api/analytics/trends?course=CPAN212&window=3
export const getPerformanceTrends = (req, res) => {
  const { course, window } = req.query;
  const windowSize = parseInt(window) || 3;
  const assignments = getStudentAssignments(req.user.userId, course);
  const result = getPerformanceSummary(assignments, windowSize);
  res.json({ course: course || 'all', ...result });
};

// GET /api/analytics/dashboard  full snapshot for the student dashboard
export const getDashboard = (req, res) => {
  const studentAssignments = getStudentAssignments(req.user.userId);
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

  const { cumulativeGPA } = calculateCumulativeGPA(
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
};
