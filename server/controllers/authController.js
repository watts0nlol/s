import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import { User } from '../models/users.js';
import sendEmail from '../utils/sendEmail.js';
import { validateLogin, validateRegistration } from '../utils/validation.js';

export const register = async (req, res, next) => {
  try {
    const { errors, value } = validateRegistration(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const { email, password, firstName, lastName } = value;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Public registration is intentionally restricted to student accounts.
    const newUser = await User.create({ email, password: hashedPassword, firstName, lastName, role: 'student' });

    try {
      await sendEmail(
        email,
        'Welcome to Student Portal',
        `Hello ${firstName}, your account was successfully created.`
      );
    } catch (emailError) {
      console.error('Welcome email delivery failed:', emailError.message);
    }

    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: { _id: newUser._id, email: newUser.email, firstName, lastName, role: newUser.role },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { errors, value } = validateLogin(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const { email, password } = value;

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (!existingUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(existingUser);

    res.json({
      token,
      user: {
        _id: existingUser._id,
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: existingUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const profile = (req, res) => {
  const { password: _password, ...user } = req.user;
  res.json({ user });
};
