// server/routers/analytics.js
// Analytics routes

import express from 'express';
import {
  getGPA,
  getCumulativeGPA,
  getPrediction,
  getPriorityList,
  getRiskAssessment,
  getPerformanceTrends,
  getDashboard,
} from '../controllers/analyticsController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken); // all analytics routes require authentication

router.get('/gpa', getGPA);                   // GET /api/analytics/gpa?course=CPAN212
router.get('/gpa/cumulative', getCumulativeGPA); // GET /api/analytics/gpa/cumulative
router.get('/predict', getPrediction);         // GET /api/analytics/predict?course=CPAN212
router.get('/priority', getPriorityList);      // GET /api/analytics/priority
router.get('/risk', getRiskAssessment);        // GET /api/analytics/risk?course=CPAN212
router.get('/trends', getPerformanceTrends);   // GET /api/analytics/trends?course=CPAN212
router.get('/dashboard', getDashboard);        // GET /api/analytics/dashboard

export default router;
