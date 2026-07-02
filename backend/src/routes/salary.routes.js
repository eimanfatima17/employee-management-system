import express from 'express';
import {
  generateSalary,
  getSalaries,
  getSalaryReport,
  exportSalaryPDF,
} from '../controllers/salary.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { salaryLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/generate', verifyToken, authorizeRoles('admin', 'hr'), salaryLimiter, generateSalary);
router.get('/', verifyToken, getSalaries);
router.get('/report/:id', verifyToken, getSalaryReport);
router.get('/pdf/:id', verifyToken, exportSalaryPDF);

export default router;
