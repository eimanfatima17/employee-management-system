import express from "express";
import {
  markAttendance,
  bulkMarkAttendance,
  getAttendance,
  getAttendanceCalendar,
  deleteAttendance,
} from "../controllers/attendance.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, authorizeRoles("admin", "hr"), markAttendance);
router.post("/bulk", verifyToken, authorizeRoles("admin", "hr"), bulkMarkAttendance);
router.get("/", verifyToken, getAttendance);
router.get("/calendar", verifyToken, getAttendanceCalendar);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteAttendance);

export default router;