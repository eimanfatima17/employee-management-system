import pool from '../config/db.js';
import { calculateSalary } from '../services/salary.service.js';
import { generateSalarySlipHTML } from '../utils/pdfGenerator.js';

export const generateSalary = async (req, res, next) => {
  let { month, year, force } = req.body;

  try {
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required' });
    }

    month = parseInt(month);
    year = parseInt(year);

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Month must be between 1 and 12' });
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Year must be between 2000 and 2100' });
    }

    const employees = await pool.query(
      `SELECT e.*
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE u.is_active = true AND e.deleted_at IS NULL`
    );

    if (!employees.rows.length) {
      return res.status(404).json({ success: false, message: 'No active employees found' });
    }

    const attCheck = await pool.query(
      `SELECT COUNT(DISTINCT employee_id) AS marked_count
       FROM attendance
       WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2`,
      [month, year]
    );

    const markedCount = parseInt(attCheck.rows[0].marked_count || 0);
    const totalCount = employees.rows.length;

    if (markedCount === 0 && !force) {
      return res.status(422).json({
        success: false,
        message: `No attendance records found for ${month}/${year}. Mark attendance first or pass force=true to generate with zero attendance.`,
        attendance_summary: { marked: markedCount, total: totalCount },
        requires_force: true,
      });
    }

    if (markedCount < totalCount && !force) {
      return res.status(422).json({
        success: false,
        message: `Attendance incomplete: ${markedCount} of ${totalCount} employees have records for ${month}/${year}. Pass force=true to generate anyway.`,
        attendance_summary: { marked: markedCount, total: totalCount },
        requires_force: true,
      });
    }

    const client = await pool.connect();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const emp of employees.rows) {
        const attResult = await client.query(
          `SELECT
            COUNT(*) FILTER (WHERE status = 'present')  AS present,
            COUNT(*) FILTER (WHERE status = 'absent')   AS absent,
            COUNT(*) FILTER (WHERE status = 'leave')    AS leaves,
            COUNT(*) FILTER (WHERE status = 'half_day') AS half_days
           FROM attendance
           WHERE employee_id = $1
             AND EXTRACT(MONTH FROM date) = $2
             AND EXTRACT(YEAR  FROM date) = $3`,
          [emp.id, month, year]
        );

        const present = parseInt(attResult.rows[0].present || 0);
        const absents = parseInt(attResult.rows[0].absent || 0);
        const leaves = parseInt(attResult.rows[0].leaves || 0);
        const halfDays = parseInt(attResult.rows[0].half_days || 0);

        const { deductions, netSalary } = calculateSalary({
          basicSalary: parseFloat(emp.salary),
          present,
          halfDays,
          year,
          month,
        });

        await client.query(
          `INSERT INTO salaries (
            employee_id, salary_year, salary_month,
            total_present, total_absent, total_leaves, total_half_days,
            basic_salary, deductions, bonuses
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
          ON CONFLICT (employee_id, salary_year, salary_month)
          DO UPDATE SET
            total_present   = EXCLUDED.total_present,
            total_absent    = EXCLUDED.total_absent,
            total_leaves    = EXCLUDED.total_leaves,
            total_half_days = EXCLUDED.total_half_days,
            basic_salary    = EXCLUDED.basic_salary,
            deductions      = EXCLUDED.deductions,
            bonuses         = 0,
            updated_at      = NOW()`,
          [emp.id, year, month, present, absents, leaves, halfDays, emp.salary, deductions]
        );

        results.push({
          employee_id: emp.id,
          employee_name: emp.name,
          basic_salary: parseFloat(emp.salary),
          present,
          absents,
          leaves,
          half_days: halfDays,
          deductions,
          net_salary: netSalary,
        });
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({
      success: true,
      message: 'Salary generated successfully',
      month,
      year,
      total_employees: results.length,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

export const getSalaries = async (req, res, next) => {
  try {
    let { page = 1, limit = 5, employee_id, month, year } = req.query;

    page = Math.max(1, parseInt(page) || 1);
    const limitValue = Math.min(Math.max(1, parseInt(limit) || 5), 100);
    const offset = (page - 1) * limitValue;

    let query = `
      SELECT s.*, e.id AS emp_id, e.name AS employee_name, e.department,
             COUNT(*) OVER() AS total_count
      FROM salaries s
      JOIN employees e ON s.employee_id = e.id
      WHERE e.deleted_at IS NULL
    `;

    const values = [];
    let idx = 1;

    if (req.user.role === 'employee') {
      query += `
        AND s.employee_id = (
          SELECT id FROM employees WHERE user_id = $${idx++} AND deleted_at IS NULL LIMIT 1
        )
      `;
      values.push(req.user.id);
    } else if (employee_id) {
      query += ` AND s.employee_id = $${idx++}`;
      values.push(parseInt(employee_id));
    }

    if (month && year) {
      query += ` AND s.salary_year = $${idx++} AND s.salary_month = $${idx++}`;
      values.push(parseInt(year), parseInt(month));
    }

    query += ` ORDER BY s.salary_year DESC, s.salary_month DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limitValue, offset);

    const result = await pool.query(query, values);
    const total = parseInt(result.rows[0]?.total_count || 0);
    const data = result.rows.map(({ total_count, ...row }) => row);

    res.json({
      success: true,
      data,
      meta: { total, page, limit: limitValue, totalPages: Math.ceil(total / limitValue) },
    });
  } catch (err) {
    next(err);
  }
};

export const getSalaryReport = async (req, res, next) => {
  const { id } = req.params;
  let { month, year } = req.query;

  try {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year query params are required' });
    }

    month = parseInt(month);
    year = parseInt(year);

    if (req.user.role === 'employee') {
      const empRow = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
        [req.user.id]
      );
      if (!empRow.rows.length || empRow.rows[0].id !== parseInt(id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const empResult = await pool.query(
      `SELECT e.*, u.email FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [id]
    );

    if (!empResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const salResult = await pool.query(
      `SELECT * FROM salaries WHERE employee_id = $1 AND salary_year = $2 AND salary_month = $3`,
      [id, year, month]
    );

    const attDetail = await pool.query(
      `SELECT date, status, check_in, check_out
       FROM attendance
       WHERE employee_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3
       ORDER BY date`,
      [id, month, year]
    );

    res.json({
      success: true,
      data: {
        employee: empResult.rows[0],
        salary: salResult.rows[0] || null,
        salaryGenerated: salResult.rows.length > 0,
        attendance: attDetail.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const exportSalaryPDF = async (req, res, next) => {
  const { id } = req.params;
  let { month, year } = req.query;

  try {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year query params are required' });
    }

    month = parseInt(month);
    year = parseInt(year);

    if (req.user.role === 'employee') {
      const empRow = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
        [req.user.id]
      );
      if (!empRow.rows.length || empRow.rows[0].id !== parseInt(id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const empResult = await pool.query(
      `SELECT e.*, u.email FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [id]
    );

    if (!empResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const salResult = await pool.query(
      `SELECT * FROM salaries WHERE employee_id = $1 AND salary_year = $2 AND salary_month = $3`,
      [id, year, month]
    );

    if (!salResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: `Salary for ${year}-${String(month).padStart(2, '0')} has not been generated yet`,
      });
    }

    const attResult = await pool.query(
      `SELECT date, status, check_in, check_out
       FROM attendance
       WHERE employee_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3
       ORDER BY date`,
      [id, month, year]
    );

    const html = generateSalarySlipHTML({
      employee: empResult.rows[0],
      salary: salResult.rows[0],
      attendance: attResult.rows,
      month,
      year,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="salary-slip-${id}-${year}-${String(month).padStart(2, '0')}.html"`);
    res.send(html);
  } catch (err) {
    next(err);
  }
};