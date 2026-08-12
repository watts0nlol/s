import assert from "node:assert/strict";
import test from "node:test";
import { groupAssignmentsByDistribution } from "../src/utils/groupAssignments.js";

const distributed = (id, studentId, status = "assigned") => ({
  _id: id,
  title: "Final Project",
  studentId,
  status,
  dueDate: "2026-09-25",
  distributionId: "distribution-1",
});

test("groups a course distribution and reports completion counts", () => {
  const result = groupAssignmentsByDistribution([
    distributed("assignment-1", "student-1", "completed"),
    distributed("assignment-2", "student-2", "completed"),
    distributed("assignment-3", "student-3"),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].isDistributionGroup, true);
  assert.equal(result[0].assignedCount, 3);
  assert.equal(result[0].completedCount, 2);
  assert.equal(result[0].pendingCount, 1);
});

test("late joiners grow the existing group and status changes update its counts", () => {
  const original = [distributed("assignment-1", "student-1", "completed")];
  const withLateJoiner = [...original, distributed("assignment-2", "student-late")];
  const completed = withLateJoiner.map((assignment) => ({ ...assignment, status: "completed" }));
  assert.equal(groupAssignmentsByDistribution(original)[0].assignedCount, 1);
  assert.equal(groupAssignmentsByDistribution(withLateJoiner)[0].assignedCount, 2);
  assert.deepEqual(
    groupAssignmentsByDistribution(completed).map(({ completedCount, pendingCount }) => ({ completedCount, pendingCount })),
    [{ completedCount: 2, pendingCount: 0 }],
  );
});

test("preserves first-occurrence sorting and leaves individual assignments untouched", () => {
  const legacy = { _id: "legacy", title: "Legacy", dueDate: "2026-09-20" };
  const individual = { _id: "individual", title: "Individual", dueDate: "2026-09-30", distributionId: null };
  const result = groupAssignmentsByDistribution([
    legacy,
    distributed("assignment-1", "student-1"),
    distributed("assignment-2", "student-2"),
    individual,
  ]);
  assert.deepEqual(result.map((assignment) => assignment._id), ["legacy", "assignment-1", "individual"]);
  assert.strictEqual(result[0], legacy);
  assert.strictEqual(result[2], individual);
});
