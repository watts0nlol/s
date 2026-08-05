const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ASSIGNMENT_STATUSES = new Set(['assigned', 'completed']);

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeRequiredString = (value, field, maxLength, errors) => {
  if (typeof value !== 'string') {
    errors.push(`${field} must be a string`);
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) errors.push(`${field} is required`);
  if (normalized.length > maxLength) {
    errors.push(`${field} must be ${maxLength} characters or fewer`);
  }
  return normalized;
};

export const validateRegistration = (body) => {
  if (!isRecord(body)) return { errors: ['Request body must be a JSON object'] };

  const errors = [];
  const email = normalizeRequiredString(body.email, 'email', 254, errors)?.toLowerCase();
  const firstName = normalizeRequiredString(body.firstName, 'firstName', 100, errors);
  const lastName = normalizeRequiredString(body.lastName, 'lastName', 100, errors);

  if (email && !EMAIL_PATTERN.test(email)) errors.push('email must be valid');

  const password = body.password;
  if (typeof password !== 'string') {
    errors.push('password must be a string');
  } else {
    if (password.length < 8) errors.push('password must be at least 8 characters');
    if (password.length > 72) errors.push('password must be 72 characters or fewer');
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.push('password must contain at least one letter and one number');
    }
  }

  return { errors, value: { email, password, firstName, lastName } };
};

export const validateLogin = (body) => {
  if (!isRecord(body)) return { errors: ['Request body must be a JSON object'] };

  const errors = [];
  const email = normalizeRequiredString(body.email, 'email', 254, errors)?.toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) errors.push('email must be valid');

  const password = body.password;
  if (typeof password !== 'string' || password.length === 0) {
    errors.push('password is required and must be a string');
  } else if (password.length > 72) {
    errors.push('password must be 72 characters or fewer');
  }

  return { errors, value: { email, password } };
};

const ASSIGNMENT_FIELDS = new Set([
  'title',
  'description',
  'dueDate',
  'status',
  'grade',
  'weight',
  'course',
  'studentId',
]);

export const validateAssignment = (body, { partial = false } = {}) => {
  if (!isRecord(body)) return { errors: ['Request body must be a JSON object'] };

  const errors = [];
  const value = {};
  const unknownFields = Object.keys(body).filter((field) => !ASSIGNMENT_FIELDS.has(field));
  if (unknownFields.length) errors.push(`Unknown field(s): ${unknownFields.join(', ')}`);

  if (!partial || body.title !== undefined) {
    value.title = normalizeRequiredString(body.title, 'title', 200, errors);
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string') errors.push('description must be a string');
    else if (body.description.length > 5000) errors.push('description must be 5000 characters or fewer');
    else value.description = body.description.trim();
  }

  if (!partial || body.dueDate !== undefined) {
    const dueDate = new Date(body.dueDate);
    if (
      (typeof body.dueDate !== 'string' && !(body.dueDate instanceof Date)) ||
      Number.isNaN(dueDate.getTime())
    ) {
      errors.push('dueDate must be a valid date');
    } else {
      value.dueDate = dueDate;
    }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ASSIGNMENT_STATUSES.has(body.status)) {
      errors.push('status must be assigned or completed');
    } else {
      value.status = body.status;
    }
  }

  for (const [field, minimum] of [['grade', 0], ['weight', 0]]) {
    if (body[field] === undefined) continue;
    if (body[field] === null && field === 'grade') {
      value[field] = null;
    } else if (typeof body[field] !== 'number' || !Number.isFinite(body[field])) {
      errors.push(`${field} must be a number`);
    } else if (body[field] < minimum || body[field] > 100) {
      errors.push(`${field} must be between 0 and 100`);
    } else {
      value[field] = body[field];
    }
  }

  if (body.course !== undefined) {
    if (typeof body.course !== 'string') errors.push('course must be a string');
    else if (body.course.trim().length > 100) errors.push('course must be 100 characters or fewer');
    else value.course = body.course.trim();
  }

  if (body.studentId !== undefined) {
    value.studentId = normalizeRequiredString(body.studentId, 'studentId', 100, errors);
  }

  if (partial && Object.keys(body).length === 0) errors.push('At least one field is required');

  return { errors, value };
};
