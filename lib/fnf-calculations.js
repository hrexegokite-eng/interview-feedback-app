const ROUNDING = { near: Math.round, down: Math.floor, up: Math.ceil };

export function amountInWords(value) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const twoDigits = (number) => number < 20
    ? ones[number]
    : `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ''}`;
  const threeDigits = (number) => {
    if (number >= 1000) {
      return `${threeDigits(Math.floor(number / 1000))} Thousand${number % 1000 ? ` ${threeDigits(number % 1000)}` : ''}`;
    }
    const hundreds = Math.floor(number / 100);
    const remainder = number % 100;
    return `${hundreds ? `${ones[hundreds]} Hundred` : ''}${hundreds && remainder ? ' ' : ''}${remainder ? twoDigits(remainder) : ''}`;
  };
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
  return words.join(' ');
}

export function calculateFnf(data) {
  const periods = [...data.periods].sort((a, b) => a.month.localeCompare(b.month));
  const round = ROUNDING[data.rounding] || Math.round;
  const earnedPerPeriod = (gross, period) => period.daysInMonth > 0
    ? round(Number((gross * period.payableDays / period.daysInMonth).toFixed(6)))
    : 0;
  const earned = (gross) => periods.reduce((total, period) => total + earnedPerPeriod(gross, period), 0);
  const components = data.components.filter(([name, value]) => name.trim() || value);
  const additionalPayments = data.additionalPayments.filter(([name, value]) => name.trim() || value);
  const deductions = data.deductions.filter(([name, value]) => name.trim() || value);
  const grossSalary = components.reduce((total, [, value]) => total + value, 0);
  const earnings = components.reduce((total, [, value]) => total + earned(value), 0);
  const totalAdditional = additionalPayments.reduce((total, [, value]) => total + value, 0);
  const totalDeductions = deductions.reduce((total, [, value]) => total + value, 0);
  const net = Math.round((earnings + totalAdditional - totalDeductions) * 100) / 100;
  return {
    periods,
    components,
    additionalPayments,
    deductions,
    grossSalary,
    earnings,
    totalAdditional,
    totalDeductions,
    net,
    earnedPerPeriod,
    earned,
    totalPayableDays: periods.reduce((total, period) => total + period.payableDays, 0),
  };
}
