import { api } from '@/components/ui';
import { amountInWords as fnfAmountInWords, calculateFnf } from '@/lib/fnf-calculations';
import { amountInWords as payslipAmountInWords, calculatePayslip } from '@/lib/payslip-calculations';

const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const clean = (value) => String(value ?? '-').replace(/[^\x20-\x7E]/g, ' ').trim() || '-';
const money = (value) => `Rs. ${INR.format(Number(value) || 0)}`;
const date = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '-';
};
const month = (value) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) return '-';
  return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 1))
    .toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

function addTable(doc, autoTable, head, body, startY) {
  autoTable(doc, {
    head: [head.map(clean)],
    body: body.map((row) => row.map(clean)),
    startY,
    margin: { left: 14, right: 14, bottom: 18 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [30, 55, 75], fontStyle: 'bold' },
    rowPageBreak: 'avoid',
  });
  return doc.lastAutoTable.finalY + 7;
}

function addHeading(doc, title, subtitle) {
  doc.setFontSize(16);
  doc.text(clean(title), 14, 17);
  doc.setFontSize(9);
  doc.text(clean(subtitle), 14, 23);
}

function addSettlement(doc, autoTable, record) {
  const data = record.data;
  const totals = calculateFnf(data);
  doc.addPage();
  addHeading(doc, 'Full & Final Settlement', `Updated ${new Date(record.updated_at).toLocaleDateString()}`);
  let y = addTable(doc, autoTable, ['Employee detail', 'Value'], [
    ['Company', record.company_name],
    ['Employee name', data.employeeName],
    ['Employee ID', data.employeeId],
    ['Department', data.department],
    ['Designation', data.designation],
    ['Date of joining', date(data.dateOfJoining)],
    ['Last working day', date(data.lastWorkingDay)],
  ], 29);
  y = addTable(doc, autoTable, ['Salary month', 'Payable days', 'Basis days'], totals.periods.map((period) => [
    month(period.month), period.payableDays, period.daysInMonth,
  ]), y);
  y = addTable(doc, autoTable, ['Salary component', 'Monthly gross', 'Earned total'], [
    ...totals.components.map(([name, value]) => [name, money(value), money(totals.earned(value))]),
    ['Total salary', money(totals.grossSalary), money(totals.earnings)],
  ], y);
  if (totals.additionalPayments.length) {
    y = addTable(doc, autoTable, ['Additional payment', 'Amount'], [
      ...totals.additionalPayments.map(([name, value]) => [name, money(value)]),
      ['Total additional payments', money(totals.totalAdditional)],
    ], y);
  }
  y = addTable(doc, autoTable, ['Deduction', 'Amount'], [
    ...totals.deductions.map(([name, value]) => [name, money(value)]),
    ['Total deductions', money(totals.totalDeductions)],
  ], y);
  addTable(doc, autoTable, ['Settlement summary', 'Amount'], [
    ['Earned salary', money(totals.earnings)],
    ['Additional payments', money(totals.totalAdditional)],
    ['Deductions', money(totals.totalDeductions)],
    [totals.net >= 0 ? 'Net payable' : 'Net recoverable', money(Math.abs(totals.net))],
    ['Amount in words', `Rupees ${fnfAmountInWords(totals.net)} only`],
  ], y);
  if (data.footerNote) {
    addTable(doc, autoTable, ['Settlement note', 'Details'], [[data.footerNote, '']], doc.lastAutoTable.finalY + 7);
  }
}

function addPayslip(doc, autoTable, record) {
  const data = record.data;
  const totals = calculatePayslip(data);
  doc.addPage();
  addHeading(doc, `Salary Slip · ${month(record.month)}`, `Updated ${new Date(record.updated_at).toLocaleDateString()}`);
  let y = addTable(doc, autoTable, ['Employee detail', 'Value'], [
    ['Company', record.company_name],
    ['Employee name', data.name],
    ['Employee ID', data.employeeId],
    ['Designation', data.designation],
    ['Work location', data.location],
    ['Date joined', date(data.joined)],
    ['Bank account number', data.account],
    ['Bank name', data.bank],
  ], 29);
  y = addTable(doc, autoTable, ['Attendance', 'Days / minutes'], [
    ['Present days', totals.attendance.present],
    ['Absent days', data.absent],
    ['Half days', data.halfDays],
    ['Leaves', data.leaves],
    ['Payable days', totals.attendance.payable],
    ['Overtime minutes', data.otMinutes],
    ['Fine minutes', data.fineMinutes],
  ], y);
  y = addTable(doc, autoTable, ['Earning', 'Full amount', 'Earned amount'], [
    ...totals.earnings.map((row) => [row.name, money(row.full), money(row.earned)]),
    ['Total earnings', money(totals.fixedGross), money(totals.totalEarnings)],
  ], y);
  y = addTable(doc, autoTable, ['Deduction', 'Amount'], [
    ...totals.deductions.map((row) => [row.name, money(row.amount)]),
    ['Total deductions', money(totals.totalDeductions)],
  ], y);
  addTable(doc, autoTable, ['Net pay summary', 'Amount'], [
    ['Total earnings', money(totals.totalEarnings)],
    ['Total deductions', money(totals.totalDeductions)],
    ['Net payable', money(totals.net)],
    ['Amount in words', `${payslipAmountInWords(totals.net)} Rupees only`],
  ], y);
}

export async function prepareHropsFolderPdf(personId) {
  const folder = await api(`/api/hrops/people/${personId}/folder`);
  if (!folder.settlements.length && !folder.payslips.length) {
    throw new Error('There are no saved documents in this employee folder.');
  }
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { person, settlements, payslips } = folder;
  const employeeName = clean(person.name);
  const employeeId = clean(person.employee_id);
  doc.setProperties({
    title: `Employee folder - ${employeeName}`,
    subject: 'Confidential employee folder export',
  });
  addHeading(doc, 'Employee Folder', employeeName);
  addTable(doc, autoTable, ['Folder detail', 'Value'], [
    ['Employee ID', employeeId],
    ['FNF settlements', settlements.length],
    ['Payslips', payslips.length],
    ['Included documents', 'All saved FNF settlements and payslips'],
    ['Generated', new Date().toLocaleString()],
  ], 29);

  settlements.forEach((record) => addSettlement(doc, autoTable, record));
  payslips.forEach((record) => addPayslip(doc, autoTable, record));

  const pageCount = doc.internal.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setFontSize(8);
    doc.text(
      `Confidential employee folder · Page ${pageNumber} of ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 7,
    );
  }

  const filename = employeeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'employee';
  const file = new File([doc.output('blob')], `${filename}-employee-folder.pdf`, { type: 'application/pdf' });
  return {
    file,
    title: `Employee folder - ${employeeName}`,
    text: `Saved FNF settlements and payslips for ${employeeName}`,
  };
}

export function canShareHropsFolderPdf(file) {
  return Boolean(navigator.share && navigator.canShare?.({ files: [file] }));
}

export function sharePreparedHropsFolderPdf({ file, title, text }) {
  return navigator.share({ files: [file], title, text }).then(
    () => 'shared',
    (error) => {
      if (error.name === 'AbortError') return 'cancelled';
      throw error;
    },
  );
}

export function downloadHropsFolderPdf(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
