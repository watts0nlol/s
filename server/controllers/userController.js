import { User } from '../models/users.js';

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
