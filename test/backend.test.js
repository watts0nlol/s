import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

import { login, register } from '../server/controllers/authController.js';
import { createAssignment, listAssignments, updateAssignment, updateAssignmentStatus } from '../server/controllers/assignmentController.js';
import { createCourse, joinCourse, listCourses } from '../server/controllers/courseController.js';
import { createCourseAnnouncement, listCourseAnnouncements } from '../server/controllers/announcementController.js';
import { listUsers, updateUserRole } from '../server/controllers/userController.js';
import { getDashboard, getGPA } from '../server/controllers/analyticsController.js';
import { generateToken, requireRole, verifyToken } from '../server/middleware/auth.js';
import logger from '../server/middleware/logger.js';
import { Assignment } from '../server/models/assignments.js';
import { Announcement } from '../server/models/announcements.js';
import { Course } from '../server/models/courses.js';
import { User } from '../server/models/users.js';
import { calculateGPA, prioritizeAssignments } from '../server/utils/analytics.js';
import { canAccessCourse } from '../server/utils/courseAccess.js';
import { authenticateSocket, authorizeSocketCourse, registerSocketHandlers } from '../server/socket.js';
import { validateAssignment, validateCourse, validateUserRoleUpdate } from '../server/utils/validation.js';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-backend-tests';

const response = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const failNext = (error) => {
  throw error;
};

test('public registration ignores a requested admin role and creates a student', async (t) => {
  let createdUser;
  t.after(() => mock.restoreAll());
  mock.method(User, 'findOne', async () => null);
  mock.method(User, 'create', async (value) => {
    createdUser = { ...value, _id: 'user-1' };
    return createdUser;
  });
  mock.method(nodemailer, 'createTransport', () => ({ sendMail: async () => undefined }));

  const req = {
    body: {
      email: 'ADMIN@example.com',
      password: 'Password123',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'admin',
    },
  };
  const res = response();

  await register(req, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(createdUser.role, 'student');
  assert.equal(createdUser.email, 'admin@example.com');
  assert.equal(res.body.user.role, 'student');
  assert.notEqual(createdUser.password, req.body.password);
});

test('registration rejects malformed identity fields and weak passwords', async () => {
  const req = {
    body: { email: 'not-an-email', password: 'short', firstName: 42, lastName: 'User' },
  };
  const res = response();

  await register(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /email must be valid/);
  assert.match(res.body.error, /password must be at least 8 characters/);
  assert.match(res.body.error, /firstName must be a string/);
});

test('public registration ignores a requested teacher role', async (t) => {
  let createdUser;
  t.after(() => mock.restoreAll());
  mock.method(User, 'findOne', async () => null);
  mock.method(User, 'create', async (value) => { createdUser = { ...value, _id: 'student-only' }; return createdUser; });
  mock.method(nodemailer, 'createTransport', () => ({ sendMail: async () => undefined }));
  const res = response();
  await register({ body: { email: 'teacher-request@example.com', password: 'Password123', firstName: 'Still', lastName: 'Student', role: 'teacher' } }, res, failNext);
  assert.equal(res.statusCode, 201);
  assert.equal(createdUser.role, 'student');
  assert.equal(res.body.user.role, 'student');
});

test('registration succeeds when welcome email delivery fails', async (t) => {
  const loggedErrors = [];
  t.after(() => mock.restoreAll());
  mock.method(User, 'findOne', async () => null);
  mock.method(User, 'create', async (value) => ({ ...value, _id: 'user-email-failure' }));
  mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async () => { throw new Error('SMTP unavailable'); },
  }));
  mock.method(console, 'error', (...args) => loggedErrors.push(args));

  const res = response();
  await register({
    body: {
      email: 'student@example.com',
      password: 'Password123',
      firstName: 'Email',
      lastName: 'Failure',
    },
  }, res, failNext);

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.email, 'student@example.com');
  assert.equal(typeof res.body.token, 'string');
  assert.equal(loggedErrors.length, 1);
  assert.equal(loggedErrors[0][0], 'Welcome email delivery failed:');
  assert.equal(loggedErrors[0][1], 'SMTP unavailable');
});

test('registration response does not wait for slow welcome email delivery', async (t) => {
  let finishEmail;
  let emailStarted = false;
  t.after(() => {
    finishEmail?.();
    mock.restoreAll();
  });
  mock.method(User, 'findOne', async () => null);
  mock.method(User, 'create', async (value) => ({ ...value, _id: 'user-slow-email' }));
  mock.method(nodemailer, 'createTransport', () => ({
    sendMail: () => {
      emailStarted = true;
      return new Promise((resolve) => { finishEmail = resolve; });
    },
  }));

  const res = response();
  const registration = register({
    body: {
      email: 'slow-email@example.com',
      password: 'Password123',
      firstName: 'Slow',
      lastName: 'Email',
    },
  }, res, failNext);

  const completedWithoutEmail = await Promise.race([
    registration.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 1000)),
  ]);

  assert.equal(completedWithoutEmail, true);
  assert.equal(emailStarted, true);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.email, 'slow-email@example.com');
  assert.equal(typeof res.body.token, 'string');
});

test('request logger redacts password fields without changing other request data', (t) => {
  const output = [];
  t.after(() => mock.restoreAll());
  mock.method(console, 'log', (message) => output.push(message));
  const req = {
    url: '/api/auth/register?password=query-secret',
    query: { source: 'demo', password: 'query-secret' },
    params: {},
    body: {
      email: 'student@example.com',
      password: 'plain-secret',
      profile: { passwordConfirmation: 'plain-secret', firstName: 'Demo' },
    },
  };
  let continued = false;

  logger(req, {}, () => { continued = true; });

  const bodyLog = output.find((line) => line.startsWith('body:'));
  assert.equal(continued, true);
  assert.match(bodyLog, /student@example\.com/);
  assert.match(bodyLog, /\[REDACTED\]/);
  assert.doesNotMatch(bodyLog, /plain-secret/);
  assert.equal(output.some((line) => line.includes('query-secret')), false);
  assert.equal(req.body.password, 'plain-secret');
});

test('login validates input and returns a JWT for valid credentials', async (t) => {
  const password = 'Password123';
  const hashedPassword = await bcrypt.hash(password, 4);
  t.after(() => mock.restoreAll());
  mock.method(User, 'findOne', async () => ({
    _id: 'user-2',
    email: 'student@example.com',
    password: hashedPassword,
    firstName: 'Test',
    lastName: 'Student',
    role: 'student',
  }));

  const res = response();
  await login({ body: { email: 'STUDENT@example.com', password } }, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.role, 'student');
  assert.equal(typeof res.body.token, 'string');
});

test('login rejects invalid input before querying the database', async () => {
  const res = response();
  await login({ body: { email: {}, password: 123 } }, res, failNext);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /email must be a string/);
  assert.match(res.body.error, /password is required and must be a string/);
});

test('JWT middleware accepts valid tokens, rejects invalid tokens, and enforces current database roles', async (t) => {
  const token = generateToken({
    _id: 'user-3',
    email: 'student@example.com',
    firstName: 'JWT',
    lastName: 'Student',
    role: 'student',
  });

  const validReq = { header: () => `Bearer ${token}` };
  let continued = false;
  t.after(() => mock.restoreAll());
  mock.method(User, 'findById', () => ({ lean: async () => ({
    _id: 'user-3', email: 'student@example.com', firstName: 'JWT', lastName: 'Student', role: 'teacher',
  }) }));
  await verifyToken(validReq, response(), () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(validReq.user.userId, 'user-3');
  assert.equal(validReq.user.role, 'teacher');
  let teacherContinued = false;
  requireRole('teacher')(validReq, response(), () => { teacherContinued = true; });
  assert.equal(teacherContinued, true);

  const invalidRes = response();
  await verifyToken({ header: () => 'Bearer invalid' }, invalidRes, () => assert.fail('must not continue'));
  assert.equal(invalidRes.statusCode, 401);

  const forbiddenRes = response();
  requireRole('admin')(validReq, forbiddenRes, () => assert.fail('must not continue'));
  assert.equal(forbiddenRes.statusCode, 403);
});

test('a stale teacher JWT loses teacher authorization after database demotion', async (t) => {
  const token = generateToken({
    _id: 'demoted-user', email: 'demoted@example.com', firstName: 'Former', lastName: 'Teacher', role: 'teacher',
  });
  t.after(() => mock.restoreAll());
  mock.method(User, 'findById', () => ({ lean: async () => ({
    _id: 'demoted-user', email: 'demoted@example.com', firstName: 'Former', lastName: 'Teacher', role: 'student',
  }) }));
  const req = { header: () => `Bearer ${token}` };
  await verifyToken(req, response(), () => undefined);
  const res = response();
  requireRole('teacher')(req, res, () => assert.fail('demoted user must not retain teacher access'));
  assert.equal(req.user.role, 'student');
  assert.equal(res.statusCode, 403);
});

test('assignment validation rejects invalid domain values', () => {
  const { errors } = validateAssignment({
    title: '   ',
    description: 12,
    dueDate: 'not-a-date',
    status: 'submitted',
    grade: 101,
    weight: -1,
    course: {},
  });

  assert.ok(errors.some((error) => error.includes('title is required')));
  assert.ok(errors.some((error) => error.includes('description must be a string')));
  assert.ok(errors.some((error) => error.includes('dueDate must be a valid date')));
  assert.ok(errors.some((error) => error.includes('status must be assigned or completed')));
  assert.ok(errors.some((error) => error.includes('grade must be between 0 and 100')));
  assert.ok(errors.some((error) => error.includes('weight must be between 0 and 100')));
  assert.ok(errors.some((error) => error.includes('course must be a string')));
});

test('student assignment creation uses the authenticated student and normalized input', async (t) => {
  let created;
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'create', async (value) => {
    created = { ...value, _id: 'assignment-1' };
    return created;
  });

  const res = response();
  await createAssignment({
    user: { userId: 'student-1', role: 'student' },
    body: {
      title: '  Final Project  ',
      dueDate: '2026-08-30',
      course: '  CPAN 366 ',
      grade: 90,
      weight: 25,
      studentId: 'another-student',
    },
  }, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(created.studentId, 'student-1');
  assert.equal(created.title, 'Final Project');
  assert.equal(created.course, 'CPAN 366');
});

test('assignment update rejects an invalid status without saving', async (t) => {
  let saved = false;
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'findById', async () => ({ save: async () => { saved = true; } }));

  const res = response();
  await updateAssignment({ params: { id: 'assignment-1' }, body: { status: 'submitted' } }, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(saved, false);
});

test('student can complete and reopen their own assignment', async (t) => {
  const assignment = {
    _id: 'assignment-owned',
    studentId: 'student-1',
    status: 'assigned',
    saveCalls: 0,
    async save() { this.saveCalls += 1; },
  };
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'findById', async () => assignment);

  const completeRes = response();
  await updateAssignmentStatus({
    params: { id: assignment._id },
    user: { userId: 'student-1', role: 'student' },
    body: { status: 'completed' },
  }, completeRes, failNext);

  assert.equal(completeRes.statusCode, 200);
  assert.equal(assignment.status, 'completed');

  const reopenRes = response();
  await updateAssignmentStatus({
    params: { id: assignment._id },
    user: { userId: 'student-1', role: 'student' },
    body: { status: 'assigned' },
  }, reopenRes, failNext);

  assert.equal(reopenRes.statusCode, 200);
  assert.equal(assignment.status, 'assigned');
  assert.equal(assignment.saveCalls, 2);
});

test('student cannot change another student assignment status', async (t) => {
  let saved = false;
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'findById', async () => ({
    studentId: 'student-2',
    status: 'assigned',
    save: async () => { saved = true; },
  }));

  const res = response();
  await updateAssignmentStatus({
    params: { id: 'assignment-other' },
    user: { userId: 'student-1', role: 'student' },
    body: { status: 'completed' },
  }, res, failNext);

  assert.equal(res.statusCode, 403);
  assert.equal(saved, false);
});

test('student status route rejects other assignment fields', async (t) => {
  let lookedUp = false;
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'findById', async () => { lookedUp = true; return null; });

  const res = response();
  await updateAssignmentStatus({
    params: { id: 'assignment-1' },
    user: { userId: 'student-1', role: 'student' },
    body: { status: 'completed', title: 'Changed title' },
  }, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /Only the status field/);
  assert.equal(lookedUp, false);
});

test('teacher can change any assignment status through the status route', async (t) => {
  const assignment = {
    studentId: 'student-2',
    status: 'assigned',
    async save() {},
  };
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'findById', async () => assignment);

  const res = response();
  await updateAssignmentStatus({
    params: { id: 'assignment-2' },
    user: { userId: 'teacher-1', role: 'teacher' },
    body: { status: 'completed' },
  }, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(assignment.status, 'completed');
});

test('priority analytics returns plain assignment fields without Mongoose internals', () => {
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const input = {
    _id: 'assignment-2',
    title: 'Research Paper',
    description: 'Draft and revise',
    studentId: 'student-1',
    dueDate,
    status: 'assigned',
    grade: 80,
    weight: 20,
    course: 'CPAN 366',
  };

  const [result] = prioritizeAssignments([input]);

  assert.equal(result.title, input.title);
  assert.equal(result.description, input.description);
  assert.equal(result.studentId, input.studentId);
  assert.equal(result.course, input.course);
  assert.equal(result.priorityScore, 30);
  assert.equal(result.priorityLabel, 'MEDIUM');
  assert.equal(Object.hasOwn(result, '$__'), false);
  assert.equal(Object.hasOwn(result, '__'), false);
  assert.equal(Object.hasOwn(result, '_doc'), false);
});

test('lean analytics preserves the existing GPA output contract and calculation', async (t) => {
  const assignments = [
    { grade: 90, weight: 40, course: 'CPAN 366', status: 'completed' },
    { grade: 80, weight: 60, course: 'CPAN 366', status: 'completed' },
  ];
  let filter;
  let leanCalled = false;
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'find', (receivedFilter) => {
    filter = receivedFilter;
    return {
      lean: async () => {
        leanCalled = true;
        return assignments;
      },
    };
  });

  const res = response();
  await getGPA({ user: { userId: 'student-1' }, query: { course: 'CPAN 366' } }, res, failNext);

  assert.deepEqual(filter, { studentId: 'student-1', course: 'CPAN 366' });
  assert.equal(leanCalled, true);
  assert.deepEqual(res.body, { course: 'CPAN 366', ...calculateGPA(assignments) });
  assert.deepEqual(res.body, { course: 'CPAN 366', average: 84, gpa: 3.3, letter: 'A-' });
});

test('assignment schema declares indexes for current filters and sorts', () => {
  const indexes = Assignment.schema.indexes().map(([fields]) => fields);

  assert.ok(indexes.some((fields) => fields.studentId === 1 && fields.dueDate === 1));
  assert.ok(indexes.some((fields) => fields.studentId === 1 && fields.course === 1));
  assert.ok(indexes.some((fields) => Object.keys(fields).length === 1 && fields.dueDate === 1));
});

test('lean assignment listing preserves the existing filter, sort, and response', async (t) => {
  const assignments = [
    { _id: 'assignment-3', studentId: 'student-1', title: 'First', dueDate: '2026-08-10' },
    { _id: 'assignment-4', studentId: 'student-1', title: 'Second', dueDate: '2026-08-20' },
  ];
  let filter;
  let sort;
  let leanCalled = false;
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'find', (receivedFilter) => {
    filter = receivedFilter;
    return {
      sort(receivedSort) {
        sort = receivedSort;
        return this;
      },
      async lean() {
        leanCalled = true;
        return assignments;
      },
    };
  });

  const res = response();
  await listAssignments({ user: { userId: 'student-1', role: 'student' } }, res, failNext);

  assert.deepEqual(filter, { studentId: 'student-1' });
  assert.deepEqual(sort, { dueDate: 1 });
  assert.equal(leanCalled, true);
  assert.deepEqual(res.body, assignments);
});

test('course validation rejects missing and unexpected fields', () => {
  const { errors } = validateCourse({ name: ' ', code: 42, semester: 'Fall' });
  assert.ok(errors.some((error) => error.includes('name is required')));
  assert.ok(errors.some((error) => error.includes('code must be a string')));
  assert.ok(errors.some((error) => error.includes('Unknown field(s): semester')));
});

test('teacher creates a course owned by their authenticated identity', async (t) => {
  let created;
  t.after(() => mock.restoreAll());
  mock.method(Course, 'create', async (value) => {
    created = { ...value, _id: 'course-1' };
    return created;
  });

  const res = response();
  await createCourse({
    user: { userId: 'teacher-1', role: 'teacher' },
    body: { name: 'Web Development', code: 'CPAN 366', teacherId: 'teacher-other' },
  }, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(created.teacherId, 'teacher-1');
  assert.match(created.joinCode, /^[A-Z0-9]{6,8}$/);
  assert.equal(res.body.joinCode, created.joinCode);
});

test('student course listing is enrollment-scoped and hides join codes', async (t) => {
  let filter;
  t.after(() => mock.restoreAll());
  mock.method(Course, 'find', (receivedFilter) => {
    filter = receivedFilter;
    return { sort: () => ({ lean: async () => [{ _id: 'course-1', code: 'CPAN 366', joinCode: 'SECRET', studentIds: ['student-1'] }] }) };
  });

  const res = response();
  await listCourses({ user: { userId: 'student-1', role: 'student' } }, res, failNext);

  assert.deepEqual(filter, { studentIds: 'student-1', active: true });
  assert.equal(res.body.length, 1);
  assert.equal(Object.hasOwn(res.body[0], 'joinCode'), false);
  assert.equal(Object.hasOwn(res.body[0], 'studentIds'), false);
  assert.equal(res.body[0].enrollmentCount, 1);
});

test('student joins an active course idempotently without receiving its join code', async (t) => {
  let query;
  let update;
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findOneAndUpdate', async (receivedQuery, receivedUpdate) => {
    query = receivedQuery;
    update = receivedUpdate;
    return { _id: 'course-1', code: 'CPAN 366', joinCode: 'JOIN123', studentIds: ['student-1'] };
  });

  const res = response();
  await joinCourse({ user: { userId: 'student-1', role: 'student' }, body: { joinCode: ' join123 ' } }, res, failNext);

  assert.deepEqual(query, { joinCode: 'JOIN123', active: true });
  assert.deepEqual(update, { $addToSet: { studentIds: 'student-1' } });
  assert.equal(Object.hasOwn(res.body, 'joinCode'), false);
});

test('invalid join codes return not found without enrolling a student', async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findOneAndUpdate', async () => null);
  const res = response();
  await joinCourse({ user: { userId: 'student-1', role: 'student' }, body: { joinCode: 'NOCOURSE' } }, res, failNext);
  assert.equal(res.statusCode, 404);
});

test('teacher listings are ownership-scoped while admins list all courses', async (t) => {
  const filters = [];
  t.after(() => mock.restoreAll());
  mock.method(Course, 'find', (filter) => {
    filters.push(filter);
    return { sort: () => ({ lean: async () => [] }) };
  });
  await listCourses({ user: { userId: 'teacher-1', role: 'teacher' } }, response(), failNext);
  await listCourses({ user: { userId: 'admin-1', role: 'admin' } }, response(), failNext);
  assert.deepEqual(filters, [{ teacherId: 'teacher-1' }, {}]);
});

test('admin can create a course assigned to an approved existing teacher id', async (t) => {
  let created;
  t.after(() => mock.restoreAll());
  mock.method(User, 'findOne', () => ({ lean: async () => ({ _id: 'teacher-1', role: 'teacher' }) }));
  mock.method(Course, 'create', async (value) => { created = { ...value, _id: 'course-admin' }; return created; });
  const res = response();
  await createCourse({
    user: { userId: 'admin-1', role: 'admin' },
    body: { name: 'Security', code: 'CPAN 400', teacherId: 'teacher-1' },
  }, res, failNext);
  assert.equal(res.statusCode, 201);
  assert.equal(created.teacherId, 'teacher-1');
});

test('course access distinguishes enrollment, ownership, and admin access', () => {
  const course = { teacherId: 'teacher-1', studentIds: ['student-1'] };
  assert.equal(canAccessCourse(course, { userId: 'student-1', role: 'student' }), true);
  assert.equal(canAccessCourse(course, { userId: 'student-2', role: 'student' }), false);
  assert.equal(canAccessCourse(course, { userId: 'teacher-1', role: 'teacher' }), true);
  assert.equal(canAccessCourse(course, { userId: 'teacher-2', role: 'teacher' }), false);
  assert.equal(canAccessCourse(course, { userId: 'admin-1', role: 'admin' }), true);
});

test('admin user listing excludes password hashes', async (t) => {
  const users = [{ _id: 'student-1', email: 's@example.com', role: 'student' }];
  let projection;
  t.after(() => mock.restoreAll());
  mock.method(User, 'find', (_filter, receivedProjection) => {
    projection = receivedProjection;
    return { lean: async () => users };
  });
  const res = response();
  await listUsers({ user: { userId: 'admin-1', role: 'admin' } }, res, failNext);
  assert.equal(projection, '-password');
  assert.deepEqual(res.body, users);
});

test('role update validation allows only student and teacher role changes', () => {
  assert.deepEqual(validateUserRoleUpdate({ role: 'teacher' }).errors, []);
  assert.ok(validateUserRoleUpdate({ role: 'admin' }).errors.some((error) => error.includes('student or teacher')));
  assert.ok(validateUserRoleUpdate({ role: 'teacher', email: 'changed@example.com' }).errors.some((error) => error.includes('Only the role field')));
});

test('admin can promote a student to teacher without changing other fields', async (t) => {
  const target = { _id: 'student-1', email: 's@example.com', firstName: 'Test', lastName: 'Student', role: 'student', password: 'secret', async save() {} };
  t.after(() => mock.restoreAll());
  mock.method(User, 'findById', async () => target);
  mock.method(console, 'log', () => undefined);
  const res = response();
  await updateUserRole({ params: { id: 'student-1' }, user: { userId: 'admin-1', role: 'admin' }, body: { role: 'teacher' } }, res, failNext);
  assert.equal(res.statusCode, 200);
  assert.equal(target.role, 'teacher');
  assert.equal(res.body.user.role, 'teacher');
  assert.equal(Object.hasOwn(res.body.user, 'password'), false);
});

test('admin can demote a teacher who owns no courses', async (t) => {
  const target = { _id: 'teacher-1', email: 't@example.com', firstName: 'Test', lastName: 'Teacher', role: 'teacher', async save() {} };
  t.after(() => mock.restoreAll());
  mock.method(User, 'findById', async () => target);
  mock.method(Course, 'exists', async () => null);
  mock.method(console, 'log', () => undefined);
  const res = response();
  await updateUserRole({ params: { id: 'teacher-1' }, user: { userId: 'admin-1', role: 'admin' }, body: { role: 'student' } }, res, failNext);
  assert.equal(res.statusCode, 200);
  assert.equal(target.role, 'student');
});

test('teacher demotion is blocked while the teacher owns a course', async (t) => {
  let saved = false;
  const target = { _id: 'teacher-1', role: 'teacher', async save() { saved = true; } };
  t.after(() => mock.restoreAll());
  mock.method(User, 'findById', async () => target);
  mock.method(Course, 'exists', async () => ({ _id: 'course-1' }));
  const res = response();
  await updateUserRole({ params: { id: 'teacher-1' }, user: { userId: 'admin-1', role: 'admin' }, body: { role: 'student' } }, res, failNext);
  assert.equal(res.statusCode, 409);
  assert.equal(saved, false);
});

test('admin role workflow blocks self changes and editing admin accounts', async (t) => {
  t.after(() => mock.restoreAll());
  const selfRes = response();
  await updateUserRole({ params: { id: 'admin-1' }, user: { userId: 'admin-1', role: 'admin' }, body: { role: 'student' } }, selfRes, failNext);
  assert.equal(selfRes.statusCode, 403);

  mock.method(User, 'findById', async () => ({ _id: 'admin-2', role: 'admin' }));
  const otherAdminRes = response();
  await updateUserRole({ params: { id: 'admin-2' }, user: { userId: 'admin-1', role: 'admin' }, body: { role: 'student' } }, otherAdminRes, failNext);
  assert.equal(otherAdminRes.statusCode, 403);
});

test('linked assignment derives its legacy course string and preserves courseId', async (t) => {
  let created;
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findById', () => ({ lean: async () => ({ _id: 'course-1', code: 'CPAN 366', teacherId: 'teacher-1', studentIds: ['student-1'] }) }));
  mock.method(Assignment, 'create', async (value) => { created = { ...value, _id: 'assignment-linked' }; return created; });

  const res = response();
  await createAssignment({
    user: { userId: 'student-1', role: 'student' },
    body: { title: 'Linked work', dueDate: '2026-09-01', courseId: 'course-1', course: 'Client value ignored' },
  }, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(created.courseId, 'course-1');
  assert.equal(created.course, 'CPAN 366');
});

test('legacy assignment remains valid without courseId', async (t) => {
  let created;
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'create', async (value) => { created = value; return value; });

  const res = response();
  await createAssignment({
    user: { userId: 'student-1', role: 'student' },
    body: { title: 'Legacy work', dueDate: '2026-09-01', course: 'Legacy 101' },
  }, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(created.course, 'Legacy 101');
  assert.equal(created.courseId, null);
});

test('teacher distributes independent assignments only to enrolled course students', async (t) => {
  let inserted = [];
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findById', () => ({ lean: async () => ({
    _id: 'course-1', code: 'CPAN 366', teacherId: 'teacher-1', studentIds: ['student-1', 'student-2', 'student-2'],
  }) }));
  mock.method(Assignment, 'findOne', () => ({ lean: async () => null }));
  mock.method(Assignment, 'insertMany', async (values) => {
    inserted = values.map((value, index) => ({ ...value, _id: `distributed-${index + 1}` }));
    return inserted;
  });

  const res = response();
  await createAssignment({
    user: { userId: 'teacher-1', role: 'teacher' },
    body: { title: 'Course Project', dueDate: '2026-09-15', courseId: 'course-1', course: '', studentId: '', weight: 20 },
  }, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.count, 2);
  assert.deepEqual(inserted.map((assignment) => assignment.studentId), ['student-1', 'student-2']);
  assert.equal(inserted.some((assignment) => assignment.studentId === 'student-3'), false);
  assert.notEqual(inserted[0]._id, inserted[1]._id);
  assert.equal(inserted.every((assignment) => assignment.status === 'assigned' && assignment.courseId === 'course-1'), true);
});

test('teacher legacy assignment creation still requires a student ID', async () => {
  const res = response();
  await createAssignment({
    user: { userId: 'teacher-1', role: 'teacher' },
    body: { title: 'Legacy assignment', dueDate: '2026-09-15', courseId: '', course: 'Legacy 101', studentId: '' },
  }, res, failNext);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /studentId is required/);
});

test('teacher cannot distribute assignments to another teacher course', async (t) => {
  let inserted = false;
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findById', () => ({ lean: async () => ({ _id: 'course-2', teacherId: 'teacher-2', studentIds: ['student-1'] }) }));
  mock.method(Assignment, 'insertMany', async () => { inserted = true; return []; });
  await assert.rejects(() => createAssignment({
    user: { userId: 'teacher-1', role: 'teacher' },
    body: { title: 'Unauthorized', dueDate: '2026-09-15', courseId: 'course-2' },
  }, response(), failNext), /Access denied/);
  assert.equal(inserted, false);
});

test('course distribution rejects an empty course', async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findById', () => ({ lean: async () => ({ _id: 'course-empty', teacherId: 'teacher-1', studentIds: [] }) }));
  const res = response();
  await createAssignment({
    user: { userId: 'teacher-1', role: 'teacher' },
    body: { title: 'Nobody receives this', dueDate: '2026-09-15', courseId: 'course-empty' },
  }, res, failNext);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /no enrolled students/);
});

test('matching course distribution is rejected as a practical duplicate safeguard', async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findById', () => ({ lean: async () => ({ _id: 'course-1', teacherId: 'teacher-1', studentIds: ['student-1'] }) }));
  mock.method(Assignment, 'findOne', () => ({ lean: async () => ({ _id: 'existing-assignment' }) }));
  const res = response();
  await createAssignment({
    user: { userId: 'teacher-1', role: 'teacher' },
    body: { title: 'Already sent', dueDate: '2026-09-15', courseId: 'course-1' },
  }, res, failNext);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /already been distributed/);
});

test('dashboard course completion uses completed assignment count, not grade weight', async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(Assignment, 'find', () => ({ lean: async () => [
    { title: 'One', course: 'CPAN 366', status: 'completed', dueDate: '2026-09-01', weight: 5 },
    { title: 'Two', course: 'CPAN 366', status: 'completed', dueDate: '2026-09-02', weight: 5 },
    { title: 'Three', course: 'CPAN 366', status: 'assigned', dueDate: '2026-09-03', weight: 90 },
  ] }));
  const res = response();
  await getDashboard({ user: { userId: 'student-1' } }, res, failNext);
  assert.equal(res.body.courses[0].totalAssignments, 3);
  assert.equal(res.body.courses[0].completedAssignments, 2);
  assert.equal(res.body.courses[0].completionPercent, 67);
});

test('student cannot link an assignment to a course they are not enrolled in', async (t) => {
  let created = false;
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findById', () => ({ lean: async () => ({ _id: 'course-1', teacherId: 'teacher-1', studentIds: [] }) }));
  mock.method(Assignment, 'create', async () => { created = true; });

  await assert.rejects(() => createAssignment({
    user: { userId: 'student-1', role: 'student' },
    body: { title: 'Blocked', dueDate: '2026-09-01', courseId: 'course-1' },
  }, response(), failNext), /Access denied/);
  assert.equal(created, false);
});

test('course announcements enforce membership for reads and ownership for writes', async (t) => {
  const course = { _id: 'course-1', teacherId: 'teacher-1', studentIds: ['student-1'] };
  t.after(() => mock.restoreAll());
  mock.method(Course, 'findById', () => ({ lean: async () => course }));
  mock.method(Announcement, 'find', () => ({ sort: () => ({ lean: async () => [{ _id: 'announcement-1', courseId: 'course-1', message: 'Welcome' }] }) }));
  mock.method(Announcement, 'create', async (value) => ({ ...value, _id: 'announcement-2' }));

  const studentRes = response();
  await listCourseAnnouncements({ params: { courseId: 'course-1' }, user: { userId: 'student-1', role: 'student' } }, studentRes, failNext);
  assert.equal(studentRes.statusCode, 200);
  assert.equal(studentRes.body[0].message, 'Welcome');

  const deniedRes = response();
  await listCourseAnnouncements({ params: { courseId: 'course-1' }, user: { userId: 'student-2', role: 'student' } }, deniedRes, failNext);
  assert.equal(deniedRes.statusCode, 403);

  const postRes = response();
  await createCourseAnnouncement({ params: { courseId: 'course-1' }, user: { userId: 'teacher-1', role: 'teacher' }, body: { message: ' Exam Friday ' } }, postRes, failNext);
  assert.equal(postRes.statusCode, 201);
  assert.equal(postRes.body.message, 'Exam Friday');

  const studentPostRes = response();
  await createCourseAnnouncement({ params: { courseId: 'course-1' }, user: { userId: 'student-1', role: 'student' }, body: { message: 'Not allowed' } }, studentPostRes, failNext);
  assert.equal(studentPostRes.statusCode, 403);

  const unrelatedTeacherRes = response();
  await createCourseAnnouncement({ params: { courseId: 'course-1' }, user: { userId: 'teacher-2', role: 'teacher' }, body: { message: 'Not allowed' } }, unrelatedTeacherRes, failNext);
  assert.equal(unrelatedTeacherRes.statusCode, 403);

  const adminRes = response();
  await createCourseAnnouncement({ params: { courseId: 'course-1' }, user: { userId: 'admin-1', role: 'admin' }, body: { message: 'Admin notice' } }, adminRes, failNext);
  assert.equal(adminRes.statusCode, 201);
});

test('Socket.IO authentication accepts valid JWTs and course authorization uses enrollment', async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(User, 'findById', (id) => ({ lean: async () => ({ _id: id, email: 's@example.com', firstName: 'S', lastName: 'One', role: 'student' }) }));
  const token = generateToken({ _id: 'student-1', email: 's@example.com', firstName: 'S', lastName: 'One', role: 'teacher' });
  const socket = { handshake: { auth: { token } }, data: {} };
  let authError;
  await authenticateSocket(socket, (error) => { authError = error; });
  assert.equal(authError, undefined);
  assert.equal(socket.data.user.userId, 'student-1');
  assert.equal(socket.data.user.role, 'student');

  const invalidSocket = { handshake: { auth: { token: 'invalid' } }, data: {} };
  await authenticateSocket(invalidSocket, (error) => { authError = error; });
  assert.match(authError.message, /Invalid or expired/);

  mock.method(Course, 'findById', (id) => ({ lean: async () => id === 'owned-by-stale-teacher'
    ? { _id: id, teacherId: 'student-1', studentIds: [] }
    : { _id: 'course-1', teacherId: 'teacher-1', studentIds: ['student-1'] } }));
  assert.ok(await authorizeSocketCourse('course-1', { userId: 'student-1', role: 'student' }));
  assert.equal(await authorizeSocketCourse('course-1', { userId: 'student-2', role: 'student' }), null);
  assert.equal(await authorizeSocketCourse('owned-by-stale-teacher', { userId: 'student-1', role: 'teacher' }), null);
});

test('Socket.IO handlers join only authorized rooms and isolate message broadcasts', async (t) => {
  const handlers = {};
  const joined = [];
  const left = [];
  const broadcasts = [];
  const socket = {
    data: { user: { userId: 'student-1', role: 'student' } },
    on(event, handler) { handlers[event] = handler; },
    join(room) { joined.push(room); },
    leave(room) { left.push(room); },
    emit() {},
  };
  const io = { to(room) { return { emit(event, message) { broadcasts.push({ room, event, message }); } }; } };
  t.after(() => mock.restoreAll());
  mock.method(User, 'findById', (id) => ({ lean: async () => ({ _id: id, firstName: 'Ada', lastName: 'Student', email: 'private@example.com', role: 'student' }) }));
  mock.method(Course, 'findById', (id) => ({ lean: async () => ({ _id: id, teacherId: 'teacher-1', studentIds: id === 'course-1' ? ['student-1'] : [] }) }));

  registerSocketHandlers(io, socket);
  await handlers.joinCourse('course-2');
  assert.deepEqual(joined, []);
  await handlers.joinCourse('course-1');
  assert.deepEqual(joined, ['course:course-1']);

  await handlers.courseMessage({ course: 'course-2', message: 'wrong room' });
  await handlers.courseMessage({ course: 'course-1', message: ' hello ', sender: { userId: 'spoofed', firstName: 'Fake', role: 'admin' } });
  assert.deepEqual(broadcasts, [{
    room: 'course:course-1',
    event: 'courseMessage',
    message: {
      course: 'course-1',
      message: 'hello',
      sender: { userId: 'student-1', firstName: 'Ada', lastName: 'Student', role: 'student' },
    },
  }]);
  assert.equal(Object.hasOwn(broadcasts[0].message.sender, 'email'), false);

  await handlers.joinCourse(null);
  assert.deepEqual(left, ['course:course-1']);
  handlers.disconnect();
});
