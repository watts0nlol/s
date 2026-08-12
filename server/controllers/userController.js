import { User } from '../models/users.js';
import { Course } from '../models/courses.js';
import { validateUserRoleUpdate } from '../utils/validation.js';

const safeUser = (user) => ({
  _id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
});

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, '-password').lean();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id, '-password').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { errors, value } = validateUserRoleUpdate(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    if (String(req.params.id) === String(req.user.userId)) {
      return res.status(403).json({ error: 'Admins cannot change their own role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be modified' });
    }

    if (user.role === 'teacher' && value.role === 'student') {
      const ownsCourse = await Course.exists({ teacherId: String(user._id) });
      if (ownsCourse) {
        return res.status(409).json({ error: 'Teacher owns courses and cannot be demoted' });
      }
    }

    user.role = value.role;
    await user.save();
    console.log(`Admin ${req.user.userId} changed user ${user._id} role to ${value.role}`);
    res.json({ user: safeUser(user) });
  } catch (error) {
    next(error);
  }
};
