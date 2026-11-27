import { amountInWords } from '@/lib/fnf-calculations';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NUMBER_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const inr = (value) => NUMBER_FORMAT.format(Number.isFinite(value) ? value : 0);
const dateParts = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
};
export const displayDate = (value) => {
  const date = dateParts(value);
  return date ? `${String(date.day).padStart(2, '0')}-${String(date.month).padStart(2, '0')}-${date.year}` : '—';
};
export const monthLabel = (month) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return '—';
  return `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
};

export default function FnfDocument({ data, totals }) {
  const multiplePeriods = totals.periods.length > 1;
  const note = data.noteTouched
    ? data.footerNote
    : `Please note that this calculation of amount payable by the employee is arrived at based on the data available in ${data.companyName.trim() || 'the company'}’s record. This is a system-generated F&F settlement statement and does not require signature or company seal.`;
  const spacing = {
    compact: { lineHeight: 1.4, cellPadding: '4px 8px' },
    normal: { lineHeight: 1.65, cellPadding: '8px 10px' },
    roomy: { lineHeight: 1.9, cellPadding: '11px 12px' },
  }[data.lineSpacing] || { lineHeight: 1.65, cellPadding: '8px 10px' };
  const netLabel = totals.net < 0 ? 'Net Recoverable from Employee' : 'Net Payable Amount';
  const paymentFormula = totals.totalAdditional ? '(A + C − B)' : '(A − B)';
  const logoWatermark = data.watermarkType === 'logo' && data.companyLogo;

  return (
    <article
      className="fnf-paper"
      style={{ '--fnf-line-height': spacing.lineHeight, '--fnf-cell-padding': spacing.cellPadding }}
    >
      {data.watermarkEnabled && (
        <div className="fnf-watermark" style={{ opacity: data.watermarkStrength / 100 }}>
          {logoWatermark
            ? <img src={data.companyLogo} alt="" />
            : <span>{data.watermarkType === 'logo' ? data.companyName : data.watermarkText}</span>}
        </div>
      )}
      <div className="fnf-paper-content">
        <div className="fnf-paper-head">
          <div className="fnf-company">{data.companyName || 'Company name'}</div>
          {data.companyLogo
            ? <img className="fnf-logo" src={data.companyLogo} alt={`${data.companyName} logo`} />
            : <div className="fnf-logo-placeholder">{(data.companyName.trim().split(/\s+/).slice(0, 2).join(' ') || 'Logo')}</div>}
        </div>

        <h1>Full &amp; Final Settlement</h1>
        <h2>Employee Details</h2>
        <div className="fnf-employee-tables">
          <table>
            <tbody>
              <tr><td>Employee Name</td><td>{data.employeeName || '—'}</td></tr>
              <tr><td>Employee ID</td><td>{data.employeeId || '—'}</td></tr>
              <tr><td>Designation</td><td>{data.designation || '—'}</td></tr>
              <tr><td>Department</td><td>{data.department || '—'}</td></tr>
            </tbody>
          </table>
          <table>
            <tbody>
              <tr><td>DOJ</td><td>{displayDate(data.dateOfJoining)}</td></tr>
              <tr><td>LWD</td><td>{displayDate(data.lastWorkingDay)}</td></tr>
              <tr>
                <td>Payable days</td>
                <td>{multiplePeriods
                  ? `${totals.totalPayableDays} (${totals.periods.map((period) => period.payableDays).join(' + ')})`
                  : totals.totalPayableDays}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Salary to Pay</h2>
        <table className="fnf-salary-table">
          <thead>
            <tr>
              <th>Particulars</th>
              <th>Gross Salary (₹)</th>
              {multiplePeriods && totals.periods.map((period) => (
                <th key={period.month}>{monthLabel(period.month)}<small>{period.payableDays} of {period.daysInMonth} days</small></th>
              ))}
              <th>{multiplePeriods ? 'Total ' : ''}Earnings (₹)</th>
            </tr>
          </thead>
          <tbody>
            {totals.components.map(([name, amount], index) => (
              <tr key={`${name}-${index}`}>
                <td>{name || '—'}</td>
                <td className="fnf-center">{inr(amount)}</td>
                {multiplePeriods && totals.periods.map((period) => (
                  <td className="fnf-center" key={period.month}>{inr(totals.earnedPerPeriod(amount, period))}</td>
                ))}
                <td className="fnf-center">{inr(totals.earned(amount))}</td>
              </tr>
            ))}
            <tr className="fnf-total-row">
              <td>TOTAL (A)</td>
              <td className="fnf-center">{inr(totals.grossSalary)}</td>
              {multiplePeriods && totals.periods.map((period) => (
                <td className="fnf-center" key={period.month}>
                  {inr(totals.components.reduce((sum, [, amount]) => sum + totals.earnedPerPeriod(amount, period), 0))}
                </td>
              ))}
              <td className="fnf-center">{inr(totals.earnings)}</td>
            </tr>
          </tbody>
        </table>

        {totals.additionalPayments.length > 0 && (
          <table className="fnf-extra-table">
            <thead><tr><th>Additional Payments</th><th>Amount (₹)</th></tr></thead>
            <tbody>
              {totals.additionalPayments.map(([name, amount], index) => (
                <tr key={`${name}-${index}`}><td>{name || '—'}</td><td className="fnf-center">{inr(amount)}</td></tr>
              ))}
              <tr className="fnf-total-row"><td>Total Additional Payments (C)</td><td className="fnf-center">{inr(totals.totalAdditional)}</td></tr>
            </tbody>
          </table>
        )}

        <table className="fnf-extra-table">
          <thead><tr><th>Deductions</th><th>Amount (₹)</th></tr></thead>
          <tbody>
            {totals.deductions.map(([name, amount], index) => (
              <tr key={`${name}-${index}`}><td>{name || '—'}</td><td className="fnf-center">{amount ? inr(amount) : 'NIL'}</td></tr>
            ))}
            <tr className="fnf-total-row"><td>Total Deductions (B)</td><td className="fnf-center">{totals.totalDeductions ? inr(totals.totalDeductions) : 'NIL'}</td></tr>
          </tbody>
        </table>

        <p className="fnf-net">{netLabel} {paymentFormula}: <strong>₹ {inr(Math.abs(totals.net))}</strong></p>
        <p className="fnf-words">Rupees {amountInWords(totals.net)} Only</p>
        {note && <p className="fnf-note">{note}</p>}
      </div>
    </article>
  );
}
