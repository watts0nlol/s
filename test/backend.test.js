import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

import { login, register } from '../server/controllers/authController.js';
import { createAssignment, updateAssignment } from '../server/controllers/assignmentController.js';
import { generateToken, requireRole, verifyToken } from '../server/middleware/auth.js';
import { Assignment } from '../server/models/assignments.js';
import { User } from '../server/models/users.js';
import { validateAssignment } from '../server/utils/validation.js';

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

test('JWT middleware accepts valid tokens, rejects invalid tokens, and enforces roles', () => {
  const token = generateToken({
    _id: 'user-3',
    email: 'student@example.com',
    firstName: 'JWT',
    lastName: 'Student',
    role: 'student',
  });

  const validReq = { header: () => `Bearer ${token}` };
  let continued = false;
  verifyToken(validReq, response(), () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(validReq.user.userId, 'user-3');

  const invalidRes = response();
  verifyToken({ header: () => 'Bearer invalid' }, invalidRes, () => assert.fail('must not continue'));
  assert.equal(invalidRes.statusCode, 401);

  const forbiddenRes = response();
  requireRole('admin')(validReq, forbiddenRes, () => assert.fail('must not continue'));
  assert.equal(forbiddenRes.statusCode, 403);
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
