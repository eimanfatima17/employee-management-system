import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { validateEmail } from '../utils/validators.js';

export const createEmployee = async (req, res, next) => {
  const { email, password, name, position, department, salary, role } = req.body;

  try {
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Email, password and name are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    if (salary !== undefined && (isNaN(salary) || parseFloat(salary) < 0)) {
      return res.status(400).json({ success: false, message: 'Salary must be a non-negative number' });
    }

    const allowedRoles = ['admin', 'hr', 'employee'];
    const assignedRole = allowedRoles.includes(role) ? role : 'employee';

    if (assignedRole === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can create admin accounts' });
    }

    if (assignedRole === 'hr' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can create HR accounts' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    let employeeRow;

    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        [email.toLowerCase().trim(), passwordHash, assignedRole]
      );

      const userId = userResult.rows[0].id;

      const empResult = await client.query(
        `INSERT INTO employees (user_id, name, position, department, salary)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          name.trim(),
          position?.trim() || null,
          department?.trim() || null,
          parseFloat(salary) >= 0 ? parseFloat(salary) : 25000,
        ]
      );

      await client.query('COMMIT');
      employeeRow = empResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        ...employeeRow,
        email: email.toLowerCase().trim(),
        role: assignedRole,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployees = async (req, res, next) => {
  try {
    let { page = 1, limit = 5, department, search } = req.query;

    page = Math.max(1, parseInt(page) || 1);
    const limitValue = Math.min(Math.max(1, parseInt(limit) || 5), 100);
    const offset = (page - 1) * limitValue;

    let query = `
      SELECT e.id, e.name, e.position, e.department, e.salary,
             e.created_at, e.updated_at, u.email, u.role, u.is_active, u.last_login,
             COUNT(*) OVER() AS total_count
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.deleted_at IS NULL
    `;

    const values = [];
    let idx = 1;

    if (req.user.role === 'employee') {
      query += ` AND u.id = $${idx++}`;
      values.push(req.user.id);
    }

    if (department) {
      query += ` AND e.department ILIKE $${idx++}`;
      values.push(`%${department.trim()}%`);
    }

    if (search) {
      const isNumeric = /^\d+$/.test(search.trim());
      if (isNumeric) {
        query += ` AND (e.name ILIKE $${idx} OR u.email ILIKE $${idx + 1} OR e.position ILIKE $${idx + 2} OR CAST(e.id AS TEXT) = $${idx + 3})`;
        values.push(`%${search}%`, `%${search}%`, `%${search}%`, search.trim());
        idx += 4;
      } else {
        query += ` AND (e.name ILIKE $${idx} OR u.email ILIKE $${idx + 1} OR e.position ILIKE $${idx + 2})`;
        values.push(`%${search}%`, `%${search}%`, `%${search}%`);
        idx += 3;
      }
    }

    query += ` ORDER BY e.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limitValue, offset);

    const result = await pool.query(query, values);
    const total = parseInt(result.rows[0]?.total_count || 0);
    const data = result.rows.map(({ total_count, ...row }) => row);

    res.json({
      success: true,
      data,
      meta: {
        total,
        page,
        limit: limitValue,
        totalPages: Math.ceil(total / limitValue),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeById = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    if (req.user.role === 'employee') {
      const selfResult = await pool.query(
        `SELECT e.*, u.email, u.role, u.is_active
         FROM employees e
         JOIN users u ON e.user_id = u.id
         WHERE e.id = $1 AND u.id = $2 AND e.deleted_at IS NULL`,
        [id, req.user.id]
      );

      if (!selfResult.rows[0]) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      return res.json({ success: true, data: selfResult.rows[0] });
    }

    const result = await pool.query(
      `SELECT e.*, u.email, u.role, u.is_active, u.last_login
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const updateEmployee = async (req, res, next) => {
  const { id } = req.params;
  const { name, position, department, salary } = req.body;

  try {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    if (salary !== undefined && (isNaN(salary) || parseFloat(salary) < 0)) {
      return res.status(400).json({ success: false, message: 'Salary must be a non-negative number' });
    }

    const check = await pool.query(
      'SELECT id, name, position, department, salary FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!check.rows[0]) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const cur = check.rows[0];

    const result = await pool.query(
      `UPDATE employees
       SET name = $1, position = $2, department = $3, salary = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        name !== undefined ? name.trim() : cur.name,
        position !== undefined ? position?.trim() || null : cur.position,
        department !== undefined ? department?.trim() || null : cur.department,
        salary !== undefined ? parseFloat(salary) : parseFloat(cur.salary),
        id,
      ]
    );

    res.json({ success: true, message: 'Employee updated successfully', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const deleteEmployee = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const emp = await pool.query(
      'SELECT id, user_id FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!emp.rows[0]) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('UPDATE employees SET deleted_at = NOW() WHERE id = $1', [id]);
      await client.query('UPDATE users SET is_active = false WHERE id = $1', [emp.rows[0].user_id]);
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [emp.rows[0].user_id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true, message: 'Employee archived successfully' });
  } catch (err) {
    next(err);
  }
};

export const deactivateEmployee = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const emp = await pool.query(
      'SELECT user_id FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!emp.rows[0]) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET is_active = false WHERE id = $1', [emp.rows[0].user_id]);
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [emp.rows[0].user_id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true, message: 'Employee account deactivated' });
  } catch (err) {
    next(err);
  }
};

export const activateEmployee = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const emp = await pool.query(
      'SELECT user_id FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!emp.rows[0]) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await pool.query('UPDATE users SET is_active = true WHERE id = $1', [emp.rows[0].user_id]);

    res.json({ success: true, message: 'Employee account activated' });
  } catch (err) {
    next(err);
  }
};
