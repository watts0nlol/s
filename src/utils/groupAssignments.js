export const groupAssignmentsByDistribution = (assignments) => {
  const groups = new Map();

  assignments.forEach((assignment) => {
    if (!assignment.distributionId) return;
    const existing = groups.get(assignment.distributionId) || [];
    existing.push(assignment);
    groups.set(assignment.distributionId, existing);
  });

  const renderedDistributions = new Set();
  return assignments.flatMap((assignment) => {
    if (!assignment.distributionId) return [assignment];
    if (renderedDistributions.has(assignment.distributionId)) return [];

    renderedDistributions.add(assignment.distributionId);
    const members = groups.get(assignment.distributionId);
    const completedCount = members.filter((member) => member.status === "completed").length;
    return [{
      ...assignment,
      isDistributionGroup: true,
      assignedCount: members.length,
      completedCount,
      pendingCount: members.length - completedCount,
    }];
  });
};
