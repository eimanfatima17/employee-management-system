import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import salaryRoutes from "./routes/salary.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import { errorHandler } from "./middlewares/error.middleware.js";
import { authLimiter, apiLimiter } from "./middlewares/rateLimiter.js";

const app = express();

app.set("strict routing", false);
app.set("case sensitive routing", false);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: Math.floor(process.uptime()) });
});

app.get("/", (req, res) => {
  res.json({ message: "EMS backend running successfully 📡" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/employees", apiLimiter, employeeRoutes);
app.use("/api/attendance", apiLimiter, attendanceRoutes);
app.use("/api/salary", apiLimiter, salaryRoutes);
app.use("/api/dashboard", apiLimiter, dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use(errorHandler);

export default app;
