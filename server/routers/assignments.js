// server/routers/assignments.js
import express from 'express'; // Express router for assignment-related routes
// Import controller functions for handling assignment operations
import {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '../controllers/assignmentController.js';
// Import middleware for authentication and role-based access control
import { verifyToken, requireRole } from '../middleware/auth.js'; 

const router = express.Router(); // Create a new router instance for assignment routes

router.use(verifyToken); // Ensure all routes in this router require authentication
router.get('/', listAssignments); // Route to list all assignments
// (students see only their own, teachers/admins see all)
router.get('/:id', getAssignment); // Route to get a single assignment by ID 
// (students can only access their own)
router.post('/', createAssignment); // Route to create a new assignment (all authenticated users)
router.put('/:id', requireRole('teacher', 'admin'), updateAssignment); // Route to update an
// existing assignment (only teachers and admins)
router.delete('/:id', requireRole('teacher', 'admin'), deleteAssignment); // Route to delete an 
// assignment (only teachers and admins)

export default router; // Export the router to be used in the main app.js file
