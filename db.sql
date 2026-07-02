CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('admin', 'hr', 'employee')),
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id          SERIAL PRIMARY KEY,
  user_id     INT           NOT NULL UNIQUE
                REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100)  NOT NULL,
  position    VARCHAR(100),
  department  VARCHAR(100),
  salary      NUMERIC(12,2) NOT NULL DEFAULT 25000
                CHECK (salary >= 0),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- soft-delete: NULL means active, timestamp means deleted
  deleted_at  TIMESTAMPTZ   DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  employee_id INT         NOT NULL
                REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  status      VARCHAR(20) NOT NULL
                CHECK (status IN ('present', 'absent', 'leave', 'half_day')),
  check_in    TIME,
  check_out   TIME,

  CONSTRAINT chk_checkout_after_checkin
    CHECK (check_out IS NULL OR check_in IS NULL OR check_out > check_in),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (employee_id, date)
);

CREATE TABLE IF NOT EXISTS salaries (
  id              SERIAL PRIMARY KEY,
  employee_id     INT           NOT NULL
                    REFERENCES employees(id) ON DELETE CASCADE,

  salary_year     SMALLINT      NOT NULL
                    CHECK (salary_year BETWEEN 2000 AND 2100),
  salary_month    SMALLINT      NOT NULL
                    CHECK (salary_month BETWEEN 1 AND 12),

  total_present   INT           NOT NULL DEFAULT 0 CHECK (total_present   >= 0),
  total_absent    INT           NOT NULL DEFAULT 0 CHECK (total_absent    >= 0),
  total_leaves    INT           NOT NULL DEFAULT 0 CHECK (total_leaves    >= 0),
  total_half_days INT           NOT NULL DEFAULT 0 CHECK (total_half_days >= 0),

  basic_salary    NUMERIC(12,2) NOT NULL CHECK (basic_salary >= 0),
  deductions      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  bonuses         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (bonuses    >= 0),

  net_salary      NUMERIC(12,2)
                    GENERATED ALWAYS AS (basic_salary - deductions + bonuses) STORED,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (employee_id, salary_year, salary_month)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL
               REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee    ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date         ON attendance(date);

CREATE INDEX IF NOT EXISTS idx_salaries_employee       ON salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_salaries_year_month     ON salaries(salary_year, salary_month);

CREATE INDEX IF NOT EXISTS idx_employee_department     ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employee_deleted_at     ON employees(deleted_at);

CREATE INDEX IF NOT EXISTS idx_users_is_active         ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role              ON users(role);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token    ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user     ON refresh_tokens(user_id);

INSERT INTO users (email, password_hash, role, is_active)
VALUES (
  'admin@ems.com',
  '$2b$10$8RDKtSuyev9xNwcBPtWjqei2haj6x2mHwkAkrFDeh3IBkU.xR7NRK',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;
UPDATE users
SET password_hash = crypt('Admin@1234', gen_salt('bf', 10))
WHERE email = 'admin@ems.com';






