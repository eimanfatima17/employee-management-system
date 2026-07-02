import express from "express";
import {
  getStats,
  getAttendanceTrends,
  getMonthlyPayroll,
  getDepartmentStats,
} from "../controllers/dashboard.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/stats", verifyToken, authorizeRoles("admin", "hr"), getStats);
router.get("/attendance-trends", verifyToken, authorizeRoles("admin", "hr"), getAttendanceTrends);
router.get("/monthly-payroll", verifyToken, authorizeRoles("admin", "hr"), getMonthlyPayroll);
router.get("/department-stats", verifyToken, authorizeRoles("admin", "hr"), getDepartmentStats);

export default router;
