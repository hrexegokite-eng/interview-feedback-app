const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_ROWS = 100;
const MAX_PERIODS = 60;

const isString = (value, maxLength) => typeof value === 'string' && value.length <= maxLength;
const isDate = (value) => !value || (
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
);
const isAmount = (value) => Number.isFinite(value) && value >= 0 && value <= 1_000_000_000;
const isRows = (rows) => Array.isArray(rows)
  && rows.length <= MAX_ROWS
  && rows.every((row) => Array.isArray(row)
    && row.length === 2
    && isString(row[0], 120)
    && isAmount(row[1]));

export async function readSettlement(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return { error: 'Settlement data is too large. Reduce the logo image size and try again.', status: 413 };
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return { error: 'Invalid settlement data.', status: 400 };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'Invalid settlement data.', status: 400 };
  }
  const encoded = JSON.stringify(data);
  if (Buffer.byteLength(encoded, 'utf8') > MAX_PAYLOAD_BYTES) {
    return { error: 'Settlement data is too large. Reduce the logo image size and try again.', status: 413 };
  }

  const strings = [
    ['companyName', 180],
    ['employeeName', 180],
    ['employeeId', 80],
    ['department', 120],
    ['designation', 120],
    ['footerNote', 2000],
    ['watermarkText', 120],
  ];
  for (const [key, maxLength] of strings) {
    if (!isString(data[key], maxLength)) {
      return { error: `Invalid ${key} value.`, status: 400 };
    }
  }
  if (!data.companyName.trim() || !data.employeeName.trim()) {
    return { error: 'Company name and employee name are required.', status: 400 };
  }
  if (!isDate(data.dateOfJoining) || !isDate(data.lastWorkingDay)) {
    return { error: 'Enter valid joining and last working dates.', status: 400 };
  }
  if (!['near', 'down', 'up'].includes(data.rounding)
    || !['cal', '30', '26'].includes(data.basis)
    || !['compact', 'normal', 'roomy'].includes(data.lineSpacing)
    || !['logo', 'text'].includes(data.watermarkType)
    || typeof data.watermarkEnabled !== 'boolean'
    || typeof data.noteTouched !== 'boolean'
    || !Number.isInteger(data.watermarkStrength)
    || data.watermarkStrength < 4
    || data.watermarkStrength > 30) {
    return { error: 'Invalid settlement options.', status: 400 };
  }
  if (data.companyLogo && (
    typeof data.companyLogo !== 'string'
    || data.companyLogo.length > 700_000
    || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(data.companyLogo)
  )) {
    return { error: 'Company logo must be a PNG, JPEG, or WebP image smaller than 500 KB.', status: 400 };
  }
  if (!Array.isArray(data.periods)
    || data.periods.length < 1
    || data.periods.length > MAX_PERIODS
    || data.periods.some((period) => !period
      || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period.month)
      || !isAmount(period.payableDays)
      || period.payableDays > 31
      || !Number.isFinite(period.daysInMonth)
      || period.daysInMonth < 1
      || period.daysInMonth > 31
      || typeof period.payableDaysTouched !== 'boolean')) {
    return { error: 'Enter valid salary month details.', status: 400 };
  }
  if (!isRows(data.components) || !isRows(data.additionalPayments) || !isRows(data.deductions)) {
    return { error: 'Enter valid salary components, payments, and deductions.', status: 400 };
  }

  return { data };
}
