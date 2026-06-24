// server/routers/users.js
import express from 'express'; // Express router for user-related routes
import { listUsers, getUser } from '../controllers/userController.js'; // Import user controller functions
import { verifyToken, requireRole } from '../middleware/auth.js'; // Middleware for authentication 
// and role-based access control

const router = express.Router(); // Create a new router instance for user routes
// All user routes require authentication and admin role
router.use(verifyToken); // Ensure user is authenticated for all routes in this router
router.get('/', requireRole('admin'), listUsers); // Only admins can list all users
router.get('/:id', requireRole('admin'), getUser); // Only admins can get user details by ID

export default router; // Export the router to be used in the main app.js file
