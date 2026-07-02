export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateRequired = (fields) => {
  return Object.values(fields).every(
    (value) => value !== undefined && value !== null && value !== ''
  );
};

export const isPositiveNumber = (value) => {
  const n = parseFloat(value);
  return !isNaN(n) && n >= 0;
};

export const isValidDate = (dateStr) => {
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

export const isFutureDate = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const input = new Date(dateStr);
  input.setHours(0, 0, 0, 0);
  return input > today;
};
