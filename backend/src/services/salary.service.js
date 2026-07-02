export const calculateSalary = ({ basicSalary, present, halfDays, year, month }) => {
  let sundays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundays++;
  }
  const workingDays = daysInMonth - sundays;
  const dailyWage = parseFloat((basicSalary / workingDays).toFixed(4));
  const effectiveDays = parseFloat((present + halfDays * 0.5).toFixed(2));
  const netSalary = parseFloat((effectiveDays * dailyWage).toFixed(2));
  const deductions = parseFloat((basicSalary - netSalary).toFixed(2));

  return {
    workingDays,
    effectiveDays,
    deductions,
    netSalary,
  };
};