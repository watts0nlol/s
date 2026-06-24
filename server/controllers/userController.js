// server/controllers/userController.js
// Controller functions for user-related operations
// These functions handle the logic for listing users and getting user details
// Import the in-memory user store (replace with DB in production)
import { users } from '../models/users.js';
// List all users (admin only)
export const listUsers = (req, res) => {
  const safeUsers = users.map(({ password: _password, ...user }) => user);
  res.json(safeUsers);
};
// Get a specific user by ID (admin only)
export const getUser = (req, res) => {
  const user = users.find((item) => item._id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password: _password, ...safeUser } = user;
  res.json(safeUser);
};
