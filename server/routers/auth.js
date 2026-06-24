// server/routers/auth.js
import express from 'express'; // Express router for authentication-related routes
// Import controller functions for handling authentication operations
import { login, register, profile } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router(); // Create a new router instance for authentication routes

router.post('/register', register); // Route to handle user registration and return a JWT token
router.post('/login', login); // Route to handle user login and return a JWT token
router.get('/profile', verifyToken, profile); // Route to get the authenticated user's profile
//  information (requires a valid JWT token)

export default router; // Export the router to be used in the main app.js file
