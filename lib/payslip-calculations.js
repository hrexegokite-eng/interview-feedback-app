export const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export function amountInWords(value) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const twoDigits = (number) => number < 20
    ? ones[number]
    : `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ''}`;
  const threeDigits = (number) => `${Math.floor(number / 100) ? `${ones[Math.floor(number / 100)]} Hundred` : ''}${Math.floor(number / 100) && number % 100 ? ' ' : ''}${number % 100 ? twoDigits(number % 100) : ''}`;
  let number = Math.abs(Math.round(value));
  if (!number) return 'Zero';
  const parts = [[10_000_000, 'Crore'], [100_000, 'Lakh'], [1_000, 'Thousand'], [100, 'Hundred']];
  const words = [];
  for (const [unit, label] of parts) {
    const count = Math.floor(number / unit);
    if (count) {
      words.push(`${threeDigits(count)} ${label}`);
      number %= unit;
    }
  }
  if (number) words.push(twoDigits(number));
  return `${value < 0 ? 'Minus ' : ''}${words.join(' ')}`;
}

export function daysInMonth(month) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month || '');
  return match ? new Date(Number(match[1]), Number(match[2]), 0).getDate() : 0;
}

export function weekOffCount(month, weekOffs) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month || '');
  if (!match) return 0;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const totalDays = daysInMonth(month);
  let count = 0;
  for (let day = 1; day <= totalDays; day += 1) {
    if (weekOffs.includes(new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay())) count += 1;
  }
  return count;
}

export function calculatePayslip(form) {
  const monthDays = daysInMonth(form.month);
  const absent = amount(form.absent);
  const halfDays = amount(form.halfDays);
  const leaves = amount(form.leaves);
  const attendance = {
    monthDays,
    payable: Math.max(0, monthDays - absent - (0.5 * halfDays)),
    present: form.autoPresent
      ? Math.max(0, monthDays - leaves - absent - halfDays)
      : amount(form.present),
  };
  const ratio = form.prorate && monthDays
    ? Math.max(0, Math.min(1, attendance.payable / monthDays))
    : 1;
  const earnings = form.earnings.map((row) => {
    const full = amount(row.amount);
    return { name: row.name, full, earned: Math.round(full * ratio) };
  });
  const deductions = form.deductions.map((row) => ({ name: row.name, amount: amount(row.amount) }));
  const fixedGross = earnings.reduce((total, row) => total + row.full, 0);
  const totalEarnings = earnings.reduce((total, row) => total + row.earned, 0);
  const totalDeductions = deductions.reduce((total, row) => total + row.amount, 0);
  return {
    attendance,
    earnings,
    deductions,
    fixedGross,
    totalEarnings,
    totalDeductions,
    net: totalEarnings - totalDeductions,
  };
}
