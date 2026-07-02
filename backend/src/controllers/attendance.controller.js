import pool from '../config/db.js';

const ALLOWED_STATUSES = ['present', 'absent', 'leave', 'half_day'];

const rejectFutureDate = (date, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = date.split('-').map(Number);
  const inputDate = new Date(y, m - 1, d);

  if (isNaN(inputDate.getTime())) {
    res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    return true;
  }

  if (inputDate > today) {
    res.status(400).json({ success: false, message: 'Cannot mark attendance for a future date' });
    return true;
  }

  return false;
};

const validateTimes = (check_in, check_out) => {
  if (!check_in || !check_out) return null;

  const [ih, im] = check_in.split(':').map(Number);
  const [oh, om] = check_out.split(':').map(Number);

  if (isNaN(ih) || isNaN(im) || isNaN(oh) || isNaN(om)) {
    return 'Invalid check_in or check_out time format. Use HH:MM';
  }

  if (oh * 60 + om <= ih * 60 + im) {
    return 'check_out must be after check_in';
  }

  return null;
};

export const markAttendance = async (req, res, next) => {
  const { employee_id, date, status, check_in, check_out } = req.body;

  try {
    if (!employee_id || !date || !status) {
      return res.status(400).json({ success: false, message: 'employee_id, date and status are required' });
    }

    const normalizedStatus = status.toLowerCase();

    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    if (rejectFutureDate(date, res)) return;

    const timeError = validateTimes(check_in, check_out);
    if (timeError) return res.status(400).json({ success: false, message: timeError });

    const empCheck = await pool.query(
      'SELECT id FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [employee_id]
    );

    if (!empCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const existing = await pool.query(
      'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
      [employee_id, date]
    );

    const isUpdate = existing.rows.length > 0;

    const result = await pool.query(
      `INSERT INTO attendance (employee_id, date, status, check_in, check_out)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (employee_id, date)
       DO UPDATE SET
         status = EXCLUDED.status,
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         updated_at = NOW()
       RETURNING *`,
      [employee_id, date, normalizedStatus, check_in || null, check_out || null]
    );

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate ? 'Attendance updated' : 'Attendance marked',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

export const bulkMarkAttendance = async (req, res, next) => {
  const { date, entries } = req.body;

  try {
    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'date and a non-empty entries[] are required' });
    }

    if (rejectFutureDate(date, res)) return;

    for (const e of entries) {
      const normalizedStatus = e.status?.toLowerCase();
      if (!e.employee_id || !normalizedStatus || !ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid entry for employee_id ${e.employee_id}: missing or invalid status`,
        });
      }

      const timeError = validateTimes(e.check_in, e.check_out);
      if (timeError) {
        return res.status(400).json({ success: false, message: `${timeError} for employee_id ${e.employee_id}` });
      }
    }

    const empIds = [...new Set(entries.map((e) => e.employee_id))];

    const empCheck = await pool.query(
      'SELECT id FROM employees WHERE id = ANY($1::int[]) AND deleted_at IS NULL',
      [empIds]
    );

    if (empCheck.rows.length !== empIds.length) {
      return res.status(404).json({ success: false, message: 'One or more employees not found' });
    }

    const client = await pool.connect();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const entry of entries) {
        const { employee_id, check_in, check_out } = entry;
        const normalizedStatus = entry.status.toLowerCase();

        const row = await client.query(
          `INSERT INTO attendance (employee_id, date, status, check_in, check_out)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (employee_id, date)
           DO UPDATE SET
             status = EXCLUDED.status,
             check_in = EXCLUDED.check_in,
             check_out = EXCLUDED.check_out,
             updated_at = NOW()
           RETURNING *`,
          [employee_id, date, normalizedStatus, check_in || null, check_out || null]
        );

        results.push(row.rows[0]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      message: `Attendance marked for ${results.length} employees`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    let { page = 1, limit = 20, employee_id, month, year } = req.query;

    page = Math.max(1, parseInt(page) || 1);
    const limitValue = Math.min(Math.max(1, parseInt(limit) || 20), 500);
    const offset = (page - 1) * limitValue;

    if ((month && !year) || (!month && year)) {
      return res.status(400).json({ success: false, message: 'Both month and year are required together' });
    }

    if (month && (parseInt(month) < 1 || parseInt(month) > 12)) {
      return res.status(400).json({ success: false, message: 'Month must be between 1 and 12' });
    }

    let query = `
      SELECT a.*, e.name AS employee_name, e.department,
             COUNT(*) OVER() AS total_count
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE e.deleted_at IS NULL
    `;

    const values = [];
    let idx = 1;

    if (req.user.role === 'employee') {
      query += ` AND a.employee_id = (SELECT id FROM employees WHERE user_id = $${idx++} AND deleted_at IS NULL LIMIT 1)`;
      values.push(req.user.id);
    } else if (employee_id) {
      query += ` AND a.employee_id = $${idx++}`;
      values.push(parseInt(employee_id));
    }

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM a.date) = $${idx++} AND EXTRACT(YEAR FROM a.date) = $${idx++}`;
      values.push(parseInt(month), parseInt(year));
    }

    query += ` ORDER BY a.date DESC LIMIT $${idx++} OFFSET $${idx++}`;
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

export const getAttendanceCalendar = async (req, res, next) => {
  try {
    let { employee_id, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required' });
    }

    month = parseInt(month);
    year = parseInt(year);

    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Month must be between 1 and 12' });
    }

    if (req.user.role === 'employee') {
      const empRow = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
        [req.user.id]
      );

      if (!empRow.rows.length) {
        return res.status(404).json({ success: false, message: 'Employee record not found' });
      }

      employee_id = empRow.rows[0].id;
    }

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'employee_id is required' });
    }

    const empCheck = await pool.query(
      `SELECT e.id, e.name, e.department, u.email
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [employee_id]
    );

    if (!empCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const records = await pool.query(
      `SELECT date, status, check_in, check_out
       FROM attendance
       WHERE employee_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       ORDER BY date ASC`,
      [employee_id, month, year]
    );

    const calendarMap = {};
    for (const row of records.rows) {
      const d = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date);
      calendarMap[d] = { status: row.status, check_in: row.check_in, check_out: row.check_out };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const calendar = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const [y, m, dd] = dateStr.split('-').map(Number);
      calendar.push({
        date: dateStr,
        day: d,
        weekday: new Date(y, m - 1, dd).toLocaleDateString('en-US', { weekday: 'short' }),
        ...(calendarMap[dateStr] || { status: 'not_marked', check_in: null, check_out: null }),
      });
    }

    const summary = records.rows.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { present: 0, absent: 0, leave: 0, half_day: 0 }
    );

    res.json({
      success: true,
      employee: empCheck.rows[0],
      month,
      year,
      summary,
      calendar,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAttendance = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid attendance ID' });
    }

    const result = await pool.query(
      'DELETE FROM attendance WHERE id = $1 RETURNING id',
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (err) {
    next(err);
  }
};