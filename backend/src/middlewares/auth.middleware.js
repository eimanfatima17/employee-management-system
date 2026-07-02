import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      "SELECT id, role, is_active FROM users WHERE id = $1",
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is deactivated. Contact admin." });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired. Please log in again." });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required: ${roles.join(" or ")}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};
