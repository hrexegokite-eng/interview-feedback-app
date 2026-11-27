import { amount, amountInWords } from '@/lib/payslip-calculations';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function displayDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return '';
  return `${Number(match[3])} ${MONTH_NAMES[Number(match[2]) - 1]}, ${match[1]}`;
}

function formatTimestamp(date) {
  const hour = date.getHours() % 12 || 12;
  const suffix = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}, ${date.getFullYear()} at ${String(hour).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${suffix}`;
}

export default function PayslipDocument({ form, totals, generatedAt, previewScale = 1 }) {
  return (
    <article className="payslip-paper" style={{ '--payslip-scale': previewScale }}>
      <div className="payslip-company">{form.company || 'Company name'}</div>
      <div className="payslip-logo">
        {form.logo
          ? <img src={form.logo} alt={`${form.company || 'Company'} logo`} />
          : <div className="payslip-logo-fallback"><b>Go Kite</b><span>Travel &amp; Tours</span></div>}
      </div>
      <h2 className="payslip-title">
        SALARY SLIP FOR THE MONTH OF {MONTH_NAMES[Number(form.month.slice(5, 7)) - 1]?.toUpperCase() || '—'} {form.month.slice(0, 4)}
      </h2>
      <div className="payslip-rule-spacer" />
      <hr />
      <div className="payslip-info-spacer" />
      <div className="payslip-info">
        <b>Employee Name:</b><span>{form.name || '—'}</span><b>Bank Account Number:</b><span>{form.account || '—'}</span>
        <b>Employee Id:</b><span>{form.employeeId || '—'}</span><b>Bank Name:</b><span>{form.bank || '—'}</span>
        <b>Designation:</b><span>{form.designation || '—'}</span><b>Payable Days:</b><span>{INR.format(totals.attendance.payable)} Days</span>
        <b>Work Location:</b><span>{form.location || '—'}</span><span /><span />
        <b>Date Joined:</b><span>{displayDate(form.joined) || '—'}</span><span /><span />
      </div>
      <div className="payslip-info-bottom" />
      <hr />
      <div className="payslip-table-spacer" />
      <table className="payslip-attendance">
        <thead><tr><th>Present Days</th><th>Absent Days</th><th>Half Days</th><th>Leaves</th><th>OT Hours</th><th>Total Fine Hours</th></tr></thead>
        <tbody><tr>
          <td>{INR.format(totals.attendance.present)}</td>
          <td>{INR.format(amount(form.absent))}</td>
          <td>{INR.format(amount(form.halfDays))}</td>
          <td>{INR.format(amount(form.leaves))}</td>
          <td>{INR.format(amount(form.otMinutes))} Mins</td>
          <td>{INR.format(amount(form.fineMinutes))} Mins</td>
        </tr></tbody>
      </table>
      <div className="payslip-earnings-spacer" />
      <table className="payslip-earnings">
        <thead><tr><th>Earnings</th><th className="center">Full</th><th className="center">Earned Wages</th><th>Deductions</th><th className="right">Amount</th></tr></thead>
        <tbody>
          {Array.from({ length: Math.max(form.earnings.length, form.deductions.length, 5) }, (_, index) => (
            <tr key={index}>
              <td>{totals.earnings[index]?.name || ''}</td>
              <td className="right">{totals.earnings[index] ? INR.format(totals.earnings[index].full) : ''}</td>
              <td className="right">{totals.earnings[index] ? INR.format(totals.earnings[index].earned) : ''}</td>
              <td>{totals.deductions[index]?.name || ''}</td>
              <td className="right">{totals.deductions[index] ? INR.format(totals.deductions[index].amount) : ''}</td>
            </tr>
          ))}
          <tr className="payslip-highlight"><td>Fixed Gross</td><td className="right">₹{INR.format(totals.fixedGross)}</td><td /><td colSpan={2} /></tr>
          <tr className="payslip-highlight"><td>Total Earnings</td><td /><td className="right">₹{INR.format(totals.totalEarnings)}</td><td>Total Deduction</td><td className="right">₹{INR.format(totals.totalDeductions)}</td></tr>
        </tbody>
      </table>
      <div className="payslip-net">
        <div className="payslip-net-top"><b>Total Net Payable</b><strong>₹{INR.format(totals.net)}</strong></div>
        <div className="payslip-words">{amountInWords(totals.net)} Rupees only</div>
        <div className="payslip-net-foot">Employee Net Pay (Earnings - Deductions)</div>
      </div>
      <div className="payslip-footer-spacer" />
      <hr />
      <div className="payslip-footer">Generated from HROps on {formatTimestamp(generatedAt)}. This is a digitally generated document and does not require a signature or seal.</div>
    </article>
  );
}
