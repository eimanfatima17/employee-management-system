import pool from '../config/db.js';

export const getStats = async (req, res, next) => {
  try {
    const [empCount, todayAtt, totalPayroll, activeCount, recentHires] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM employees WHERE deleted_at IS NULL'),
      pool.query(`SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE AND status = 'present'`),
      pool.query(
        `SELECT COALESCE(SUM(s.net_salary), 0) AS total
         FROM salaries s
         JOIN employees e ON s.employee_id = e.id
         WHERE e.deleted_at IS NULL`
      ),
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE u.is_active = true)  AS active,
          COUNT(*) FILTER (WHERE u.is_active = false) AS inactive
         FROM employees e
         JOIN users u ON e.user_id = u.id
         WHERE e.deleted_at IS NULL`
      ),
      pool.query(
        `SELECT COUNT(*) FROM employees
         WHERE deleted_at IS NULL
           AND created_at >= NOW() - INTERVAL '30 days'`
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees: parseInt(empCount.rows[0].count),
        todayPresent: parseInt(todayAtt.rows[0].count),
        totalSalaryPaid: parseFloat(totalPayroll.rows[0].total),
        activeEmployees: parseInt(activeCount.rows[0].active),
        inactiveEmployees: parseInt(activeCount.rows[0].inactive),
        newHiresLast30Days: parseInt(recentHires.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceTrends = async (req, res, next) => {
  try {
    const months = Math.min(Math.max(1, parseInt(req.query.months) || 6), 24);

    const result = await pool.query(
      `SELECT
        TO_CHAR(a.date, 'YYYY-MM') AS month,
        COUNT(*) FILTER (WHERE a.status = 'present')  AS present,
        COUNT(*) FILTER (WHERE a.status = 'absent')   AS absent,
        COUNT(*) FILTER (WHERE a.status = 'leave')    AS on_leave,
        COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_day
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.date >= DATE_TRUNC('month', NOW()) - ($1 - 1) * INTERVAL '1 month'
         AND e.deleted_at IS NULL
       GROUP BY TO_CHAR(a.date, 'YYYY-MM')
       ORDER BY month ASC`,
      [months]
    );

    res.json({ success: true, months, data: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getMonthlyPayroll = async (req, res, next) => {
  try {
    const months = Math.min(Math.max(1, parseInt(req.query.months) || 6), 24);

    const result = await pool.query(
      `WITH month_series AS (
        SELECT
          TO_CHAR(gs, 'YYYY-MM')      AS month,
          EXTRACT(YEAR  FROM gs)::INT AS salary_year,
          EXTRACT(MONTH FROM gs)::INT AS salary_month
        FROM generate_series(
          DATE_TRUNC('month', NOW()) - ($1 - 1) * INTERVAL '1 month',
          DATE_TRUNC('month', NOW()),
          '1 month'
        ) AS gs
      )
      SELECT
        ms.month,
        COALESCE(SUM(s.net_salary), 0) AS total_payroll,
        COALESCE(SUM(s.deductions), 0) AS total_deductions,
        COALESCE(SUM(s.bonuses), 0)    AS total_bonuses,
        COUNT(s.id)                    AS employee_count
      FROM month_series ms
      LEFT JOIN salaries s
        ON s.salary_year  = ms.salary_year
       AND s.salary_month = ms.salary_month
      GROUP BY ms.month
      ORDER BY ms.month ASC`,
      [months]
    );

    res.json({
      success: true,
      months,
      data: result.rows.map((r) => ({
        month: r.month,
        total_payroll: parseFloat(r.total_payroll),
        total_deductions: parseFloat(r.total_deductions),
        total_bonuses: parseFloat(r.total_bonuses),
        employee_count: parseInt(r.employee_count),
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const getDepartmentStats = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        COALESCE(e.department, 'Unassigned') AS department,
        COUNT(*)                             AS employee_count,
        ROUND(AVG(e.salary), 2)              AS avg_salary
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.deleted_at IS NULL
       GROUP BY COALESCE(e.department, 'Unassigned')
       ORDER BY employee_count DESC`
    );

    res.json({
      success: true,
      data: result.rows.map((r) => ({
        department: r.department,
        employee_count: parseInt(r.employee_count),
        avg_salary: parseFloat(r.avg_salary),
      })),
    });
  } catch (err) {
    next(err);
  }
};
