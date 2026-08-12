import {
  calculateGPA,
  calculateCumulativeGPA,
  predictFinalGrade,
  prioritizeAssignments,
  detectRisk,
  getPerformanceSummary,
} from '../utils/analytics.js';

import { Assignment } from '../models/assignments.js';
import { Course } from '../models/courses.js';

const getStudentAssignments = async (userId, course = null) => {
  const filter = { studentId: userId };
  if (course) filter.course = course;
  return Assignment.find(filter).lean();
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

    const courses = Object.entries(courseMap).map(([courseName, assignments]) => {
      const completedAssignments = assignments.filter((assignment) => assignment.status === 'completed').length;
      return {
        courseName,
        gpa: calculateGPA(assignments),
        prediction: predictFinalGrade(assignments),
        risk: detectRisk(assignments),
        trends: getPerformanceSummary(assignments),
        totalAssignments: assignments.length,
        completedAssignments,
        completionPercent: assignments.length > 0 ? Math.round((completedAssignments / assignments.length) * 100) : 0,
      };
    });

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

export const buildTeacherDashboard = (courses, assignments, now = new Date()) => {
  const courseById = new Map(courses.map((course) => [String(course._id), course]));
  const groups = new Map();

  assignments.forEach((assignment) => {
    if (!assignment.distributionId || !courseById.has(String(assignment.courseId))) return;
    const members = groups.get(assignment.distributionId) || [];
    members.push(assignment);
    groups.set(assignment.distributionId, members);
  });

  const distributions = [...groups.entries()].map(([distributionId, members]) => {
    const template = members[0];
    const completedCount = members.filter((assignment) => assignment.status === 'completed').length;
    return {
      distributionId,
      title: template.title,
      course: template.course || courseById.get(String(template.courseId))?.code || 'Uncategorized',
      courseId: String(template.courseId),
      dueDate: template.dueDate,
      weight: template.weight,
      assignedCount: members.length,
      completedCount,
      pendingCount: members.length - completedCount,
    };
  });

  const distributedCopies = distributions.reduce((sum, distribution) => sum + distribution.assignedCount, 0);
  const completedCopies = distributions.reduce((sum, distribution) => sum + distribution.completedCount, 0);
  const activeDistributions = distributions.filter((distribution) => distribution.pendingCount > 0);
  const upcomingAssignments = activeDistributions
    .filter((distribution) => new Date(distribution.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6);
  const attentionCutoff = new Date(now.getTime() + (7 * 86400000));
  const needsAttention = activeDistributions
    .filter((distribution) => new Date(distribution.dueDate) <= attentionCutoff)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6)
    .map((distribution) => ({
      ...distribution,
      attentionType: new Date(distribution.dueDate) < now ? 'overdue' : 'approaching',
    }));

  const courseSummaries = courses.map((course) => {
    const courseDistributions = distributions.filter((distribution) => distribution.courseId === String(course._id));
    const totalCopies = courseDistributions.reduce((sum, distribution) => sum + distribution.assignedCount, 0);
    const courseCompleted = courseDistributions.reduce((sum, distribution) => sum + distribution.completedCount, 0);
    return {
      code: course.code,
      name: course.name,
      studentCount: course.studentIds?.length || 0,
      activeAssignmentCount: courseDistributions.filter((distribution) => distribution.pendingCount > 0).length,
      completionPercent: totalCopies ? Math.round((courseCompleted / totalCopies) * 100) : null,
    };
  });

  return {
    summary: {
      coursesTaught: courses.length,
      uniqueStudents: new Set(courses.flatMap((course) => (course.studentIds || []).map(String))).size,
      activeAssignments: activeDistributions.length,
      overallCompletionPercent: distributedCopies ? Math.round((completedCopies / distributedCopies) * 100) : 0,
      completedCopies,
      distributedCopies,
    },
    courses: courseSummaries,
    upcomingAssignments,
    needsAttention,
  };
};

export const getTeacherDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const courses = await Course.find({ teacherId: req.user.userId }).sort({ code: 1 }).lean();
    const courseIds = courses.map((course) => String(course._id));
    const assignments = courseIds.length
      ? await Assignment.find({ courseId: { $in: courseIds }, distributionId: { $ne: null } }).lean()
      : [];
    res.json(buildTeacherDashboard(courses, assignments));
  } catch (error) {
    next(error);
  }
};
