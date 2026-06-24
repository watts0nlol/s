// server/controllers/authController.js
// Handles user registration, login, and profile retrieval
// Uses bcrypt for password hashing and JWT for authentication

import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth.js"; // JWT generator
import { users } from "../models/users.js"; // In-memory user store
import sendEmail from "../utils/sendEmail.js"; // Email utility

// Helper function to find a user by email
const findUserByEmail = (email) =>
  users.find((user) => user.email === email);


// REGISTER USER
export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role = "student" } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "Missing required registration fields" });
    }

    // Check if email already exists
    if (findUserByEmail(email)) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object
    const newUser = {
      _id: `${Date.now()}`,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
    };

    // Save user
    users.push(newUser);

    // SEND WELCOME EMAIL
    await sendEmail(
      email,
      "Welcome to Student Portal",
      `Hello ${firstName}, your account was successfully created.`
    );

    // Generate JWT
    const token = generateToken(newUser);

    // Return response
    res.status(201).json({
      token,
      user: { ...newUser, password: undefined },
    });
  } catch (error) {
    next(error);
  }
};


// LOGIN USER
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingUser = findUserByEmail(email);

    if (!existingUser) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password
    const passwordMatches = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(existingUser);

    res.json({
      token,
      user: { ...existingUser, password: undefined },
    });
  } catch (error) {
    next(error);
  }
};


// USER PROFILE
export const profile = (req, res) => {
  const { password: _password, ...user } = req.user;
  res.json({ user });
};
