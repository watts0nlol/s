/**
 * converts a numeric grade 0–100 to a GPA point value
 */
export const gradeToGPA = (grade) => {
  if (grade >= 90) return 4.0;
  if (grade >= 85) return 3.7;
  if (grade >= 80) return 3.3;
  if (grade >= 77) return 3.0;
  if (grade >= 73) return 2.7;
  if (grade >= 70) return 2.3;
  if (grade >= 67) return 2.0;
  if (grade >= 63) return 1.7;
  if (grade >= 60) return 1.3;
  if (grade >= 57) return 1.0;
  return 0.0;
};

/**
 * converts a numeric grade to a letter grade.
 */
export const gradeToLetter = (grade) => {
  if (grade >= 90) return 'A+';
  if (grade >= 85) return 'A';
  if (grade >= 80) return 'A-';
  if (grade >= 77) return 'B+';
  if (grade >= 73) return 'B';
  if (grade >= 70) return 'B-';
  if (grade >= 67) return 'C+';
  if (grade >= 63) return 'C';
  if (grade >= 60) return 'C-';
  if (grade >= 57) return 'D+';
  if (grade >= 50) return 'D';
  return 'F';
};

/**
 * calculates weighted average grade for a list of assignments
 */
export const calculateWeightedAverage = (assignments) => {
  const graded = assignments.filter(
    (a) => a.grade !== null && a.grade !== undefined && a.weight
  );
  if (graded.length === 0) return null;

  const totalWeight = graded.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight === 0) return null;

  const weightedSum = graded.reduce((sum, a) => sum + a.grade * a.weight, 0);
  return parseFloat((weightedSum / totalWeight).toFixed(2));
};

/**
 * calculates GPA for a single course
 */
export const calculateCourseGPA = (assignments) => {
  const average = calculateWeightedAverage(assignments);
  if (average === null) return { average: null, gpa: null, letter: null };

  return {
    average,
    gpa: gradeToGPA(average),
    letter: gradeToLetter(average),
  };
};

/**
 * calculates cumulative GPA across multiple courses
 */
export const calculateCumulativeGPA = (courses) => {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const course of courses) {
    const { gpa } = calculateCourseGPA(course.assignments);
    if (gpa !== null) {
      const credits = course.credits || 3; // default 3 credits
      totalPoints += gpa * credits;
      totalCredits += credits;
    }
  }

  if (totalCredits === 0) return null;
  return parseFloat((totalPoints / totalCredits).toFixed(2));
};


// predicts final course grade based on completed assignments and remaining ones

export const predictGrade = (completedAssignments, remainingAssignments, targetGrade = 70) => {
  const gradedWeight = completedAssignments.reduce((s, a) => s + (a.weight || 0), 0);
  const remainingWeight = remainingAssignments.reduce((s, a) => s + (a.weight || 0), 0);
  const totalWeight = gradedWeight + remainingWeight;

  const currentAverage = calculateWeightedAverage(completedAssignments);

  // completion percentage (0–100)
  const completionPercent = totalWeight > 0
    ? parseFloat(((gradedWeight / totalWeight) * 100).toFixed(1))
    : 0;

  // projected final if student maintains current average on remaining work
  let projectedFinal = null;
  if (currentAverage !== null && totalWeight > 0) {
    const earnedPoints = currentAverage * (gradedWeight / totalWeight);
    const projectedRemainingPoints = currentAverage * (remainingWeight / totalWeight);
    projectedFinal = parseFloat((earnedPoints + projectedRemainingPoints).toFixed(2));
  }

  // required average on remaining assignments to hit target grade
  let requiredAverage = null;
  let isAchievable = false;
  if (remainingWeight > 0 && totalWeight > 0) {
    const earnedSoFar = currentAverage !== null
      ? currentAverage * (gradedWeight / totalWeight)
      : 0;
    const neededFromRemaining = targetGrade - earnedSoFar;
    requiredAverage = parseFloat(
      ((neededFromRemaining / (remainingWeight / totalWeight))).toFixed(2)
    );
    isAchievable = requiredAverage <= 100;
  } else if (remainingWeight === 0) {
    // no remaining work grade is final
    isAchievable = currentAverage !== null && currentAverage >= targetGrade;
  }

  // scenarios
  const currentAvg = currentAverage ?? 0;
  const scenario = remainingWeight > 0 && totalWeight > 0
    ? {
        optimistic: parseFloat(
          ((currentAvg * gradedWeight + 95 * remainingWeight) / totalWeight).toFixed(2)
        ),
        realistic: projectedFinal,
        pessimistic: parseFloat(
          ((currentAvg * gradedWeight + 55 * remainingWeight) / totalWeight).toFixed(2)
        ),
      }
    : { optimistic: currentAverage, realistic: currentAverage, pessimistic: currentAverage };

  return {
    currentAverage,
    projectedFinal,
    requiredAverage,
    completionPercent,
    isAchievable,
    scenario,
  };
};



// Calculates a priority score for an assignment
export const calculatePriorityScore = (assignment) => {
  const now = new Date();
  const due = new Date(assignment.dueDate);
  const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);

  if (assignment.status === 'completed') return -1; // completed items always last

  // exponential ramp as deadline approaches
  let urgencyScore;
  if (daysUntilDue < 0) {
    urgencyScore = 200; // Overdue 
  } else if (daysUntilDue <= 1) {
    urgencyScore = 100;
  } else if (daysUntilDue <= 3) {
    urgencyScore = 70;
  } else if (daysUntilDue <= 7) {
    urgencyScore = 40;
  } else if (daysUntilDue <= 14) {
    urgencyScore = 20;
  } else {
    urgencyScore = 5;
  }

  // weight component 
  const weightScore = ((assignment.weight || 10) / 100) * 50;

  return parseFloat((urgencyScore + weightScore).toFixed(2));
};

export const getPriorityLabel = (score) => {
  if (score >= 150) return 'OVERDUE';
  if (score >= 80)  return 'CRITICAL';
  if (score >= 50)  return 'HIGH';
  if (score >= 30)  return 'MEDIUM';
  if (score >= 0)   return 'LOW';
  return 'DONE';
};

/*
 * sorts a list of assignments with priority data
 */
export const prioritizeAssignments = (assignments) => {
  const now = new Date();

  return assignments
    .map((a) => {
      const due = new Date(a.dueDate);
      const daysUntilDue = parseFloat(((due - now) / (1000 * 60 * 60 * 24)).toFixed(1));
      const priorityScore = calculatePriorityScore(a);
      const priorityLabel = getPriorityLabel(priorityScore);

      return { ...a, priorityScore, priorityLabel, daysUntilDue };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
};


/**
 * risk levels
 */
export const RISK_LEVELS = {
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

/**
 * analyzes a student academic situation and returns risk alertss
 */
export const detectRisks = ({
  assignments = [],
  courses = [],
  targetGPA = 2.0,
  passingGrade = 60,
} = {}) => {
  const alerts = [];
  const now = new Date();

  // 1. overdue assignments
  const overdue = assignments.filter(
    (a) => a.status !== 'completed' && new Date(a.dueDate) < now
  );
  if (overdue.length > 0) {
    alerts.push({
      type: 'OVERDUE_ASSIGNMENTS',
      level: RISK_LEVELS.CRITICAL,
      message: `You have ${overdue.length} overdue assignment${overdue.length > 1 ? 's' : ''}. Submit immediately to minimize grade impact.`,
      assignments: overdue.map((a) => a.title || a._id),
    });
  }

  // 2. High weight assignments due soon (within 48 hours, weight >= 20%)
  const urgentHeavy = assignments.filter((a) => {
    if (a.status === 'completed') return false;
    const daysLeft = (new Date(a.dueDate) - now) / (1000 * 60 * 60 * 24);
    return daysLeft >= 0 && daysLeft <= 2 && (a.weight || 0) >= 20;
  });
  if (urgentHeavy.length > 0) {
    alerts.push({
      type: 'HIGH_WEIGHT_DEADLINE',
      level: RISK_LEVELS.HIGH,
      message: `High weight assignment(s) due in 48 hours: ${urgentHeavy.map((a) => a.title).join(', ')}. These significantly impact your grade.`,
      assignments: urgentHeavy.map((a) => a.title || a._id),
    });
  }

  // 3. Per-course grade falling below passing
  for (const course of courses) {
    const { average } = calculateCourseGPA(course.assignments || []);
    if (average !== null && average < passingGrade) {
      alerts.push({
        type: 'FAILING_COURSE',
        level: RISK_LEVELS.CRITICAL,
        message: `Your grade in ${course.name || 'a course'} is ${average.toFixed(1)}%, which is below the passing threshold of ${passingGrade}%.`,
        course: course.name,
      });
    } else if (average !== null && average < passingGrade + 10) {
      alerts.push({
        type: 'AT_RISK_COURSE',
        level: RISK_LEVELS.HIGH,
        message: `Your grade in ${course.name || 'a course'} (${average.toFixed(1)}%) isvery  close to failing. Focus on upcomng assignments.`,
        course: course.name,
      });
    }
  }

  // 4. overall GPA below target
  const cumulativeGPA = calculateCumulativeGPA(courses);
  if (cumulativeGPA !== null && cumulativeGPA < targetGPA) {
    alerts.push({
      type: 'GPA_BELOW_TARGET',
      level: cumulativeGPA < 1.5 ? RISK_LEVELS.CRITICAL : RISK_LEVELS.MEDIUM,
      message: `Your cumulative GPA (${cumulativeGPA.toFixed(2)}) is below your target of ${targetGPA.toFixed(2)}. review your grade prediction to understand what you need.`,
    });
  }

  // 5. pending assignments (workload warning)
  const pending = assignments.filter((a) => a.status !== 'completed');
  if (pending.length >= 5) {
    alerts.push({
      type: 'HIGH_WORKLOAD',
      level: RISK_LEVELS.MEDIUM,
      message: `You have ${pending.length} incomplete assignments. use the priority view to focus on what matters most.`,
    });
  }

  return alerts;
};


/**
chronological grade trend from completed assignments
 */
export const analyzePerformanceTrend = (assignments, windowSize = 3) => {
  const graded = assignments
    .filter((a) => a.grade !== null && a.grade !== undefined)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (graded.length === 0) return [];

  const trendPoints = [];

  graded.forEach((a, index) => {
    // Rolling average over last `windowSize` assignments
    const start = Math.max(0, index - windowSize + 1);
    const window = graded.slice(start, index + 1);
    const rollingAverage = parseFloat(
      (window.reduce((sum, w) => sum + w.grade, 0) / window.length).toFixed(2)
    );

    trendPoints.push({
      date: a.dueDate,
      grade: a.grade,
      rollingAverage,
      title: a.title,
      course: a.course,
    });
  });

  return trendPoints;
};

/**
 * detects whether performance is improving, declining, or stable.
 */
export const getTrendDirection = (trendPoints) => {
  if (trendPoints.length < 3) {
    return { direction: 'insufficient_data', delta: 0 };
  }

  // compare first third average vs last third average
  const third = Math.floor(trendPoints.length / 3);
  const early = trendPoints.slice(0, third);
  const recent = trendPoints.slice(-third);

  const earlyAvg = early.reduce((s, p) => s + p.grade, 0) / early.length;
  const recentAvg = recent.reduce((s, p) => s + p.grade, 0) / recent.length;
  const delta = parseFloat((recentAvg - earlyAvg).toFixed(2));

  let direction;
  if (delta > 5) direction = 'improving';
  else if (delta < -5) direction = 'declining';
  else direction = 'stable';

  return { direction, delta };
};

/**
 * Generates a per course breakdown of performance stats
 */
export const getCourseBreakdown = (assignments) => {
  const courseMap = {};

  for (const a of assignments) {
    const key = a.course || 'Unknown';
    if (!courseMap[key]) courseMap[key] = [];
    courseMap[key].push(a);
  }

  const breakdown = {};
  for (const [courseName, courseAssignments] of Object.entries(courseMap)) {
    const { average, gpa, letter } = calculateCourseGPA(courseAssignments);
    const trend = analyzePerformanceTrend(courseAssignments);
    const { direction, delta } = getTrendDirection(trend);

    breakdown[courseName] = {
      average,
      gpa,
      letter,
      trendDirection: direction,
      trendDelta: delta,
      trendPoints: trend,
      assignmentCount: courseAssignments.length,
      gradedCount: courseAssignments.filter((a) => a.grade !== null && a.grade !== undefined).length,
    };
  }

  return breakdown;
};

// --- Aliases/adapters matching the analyticsController API ---

export const calculateGPA = calculateCourseGPA;

/**
 * splits assignments into completed/remaining and projects a final grade
 */
export const predictFinalGrade = (assignments) => {
  const completed = assignments.filter((a) => a.status === 'completed');
  const remaining = assignments.filter((a) => a.status !== 'completed');
  return predictGrade(completed, remaining);
};

/**
 * runs risk detection over a single assignment list and summarizes the result
 */
export const detectRisk = (assignments) => {
  const alerts = detectRisks({ assignments });
  const { average } = calculateCourseGPA(assignments);
  const { projectedFinal } = predictFinalGrade(assignments);

  const levelOrder = Object.values(RISK_LEVELS);
  const riskLevel = alerts.reduce(
    (highest, alert) =>
      levelOrder.indexOf(alert.level) > levelOrder.indexOf(highest) ? alert.level : highest,
    RISK_LEVELS.NONE
  );

  return {
    riskLevel,
    alerts,
    recommendations: alerts.map((alert) => alert.message),
    currentGrade: average ?? 0,
    predictedGrade: projectedFinal ?? average ?? 0,
  };
};

/**
 * performance trend summary for a list of assignments
 */
export const getPerformanceSummary = (assignments, windowSize = 3) => {
  const trend = analyzePerformanceTrend(assignments, windowSize);
  const { direction, delta } = getTrendDirection(trend);
  return { trend, direction, delta };
};
