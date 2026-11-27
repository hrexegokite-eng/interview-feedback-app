const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_PDF_BYTES = 2_000_000;
const MAX_MULTIPART_BYTES = MAX_PAYLOAD_BYTES + MAX_PDF_BYTES + 100_000;
const MAX_ROWS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isString = (value, limit) => typeof value === 'string' && value.length <= limit;
const isAmount = (value, maximum = 1_000_000_000) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum;
};
const isDate = (value) => !value || (
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
);
const isRows = (rows) => Array.isArray(rows)
  && rows.length <= MAX_ROWS
  && rows.every((row) => row
    && typeof row === 'object'
    && isString(row.name, 120)
    && isAmount(row.amount));

export async function readPayslip(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  const isMultipart = request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data');
  if (contentLength > (isMultipart ? MAX_MULTIPART_BYTES : MAX_PAYLOAD_BYTES)) {
    return { error: 'Payslip data and PDF are too large. Reduce the logo image size and try again.', status: 413 };
  }

  let data;
  let pdf = null;
  if (isMultipart) {
    let fields;
    try {
      fields = await request.formData();
      const serializedData = fields.get('data');
      if (typeof serializedData !== 'string') throw new Error('Invalid payslip data.');
      data = JSON.parse(serializedData);
    } catch {
      return { error: 'Invalid payslip data.', status: 400 };
    }

    const file = fields.get('pdf');
    if (file !== null) {
      if (typeof file === 'string' || file.size > MAX_PDF_BYTES || file.type !== 'application/pdf') {
        return { error: 'The generated payslip PDF is invalid or too large.', status: 400 };
      }
      pdf = Buffer.from(await file.arrayBuffer());
      if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return { error: 'The generated payslip PDF is invalid.', status: 400 };
      }
    }
  } else {
    try {
      data = await request.json();
    } catch {
      return { error: 'Invalid payslip data.', status: 400 };
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'Invalid payslip data.', status: 400 };
  }
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_PAYLOAD_BYTES) {
    return { error: 'Payslip data is too large. Reduce the logo image size and try again.', status: 413 };
  }

  const stringFields = [
    ['company', 180],
    ['name', 180],
    ['employeeId', 80],
    ['designation', 120],
    ['location', 180],
    ['joined', 10],
    ['account', 40],
    ['bank', 120],
  ];
  for (const [field, limit] of stringFields) {
    if (!isString(data[field], limit)) return { error: `Invalid ${field} value.`, status: 400 };
  }
  if (!data.company.trim() || !data.name.trim()) {
    return { error: 'Company name and employee name are required to save a payslip.', status: 400 };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month || '')
    || !isDate(data.joined)
    || !['present', 'absent', 'halfDays', 'leaves'].every((field) => isAmount(data[field], 31))
    || !['otMinutes', 'fineMinutes'].every((field) => isAmount(data[field], 1_000_000))
    || typeof data.autoPresent !== 'boolean'
    || typeof data.prorate !== 'boolean'
    || !Array.isArray(data.weekOffs)
    || data.weekOffs.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    || new Set(data.weekOffs).size !== data.weekOffs.length) {
    return { error: 'Enter valid month and attendance details.', status: 400 };
  }
  if (!isRows(data.earnings) || !isRows(data.deductions)) {
    return { error: 'Enter valid earnings and deductions.', status: 400 };
  }
  if (data.logo && (
    !isString(data.logo, 700_000)
    || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(data.logo)
  )) {
    return { error: 'Logo must be a PNG, JPEG, or WebP image smaller than 500 KB.', status: 400 };
  }
  if (data.personId && (typeof data.personId !== 'string' || !UUID.test(data.personId))) {
    return { error: 'Choose a valid employee folder.', status: 400 };
  }

  return { data, pdf };
}
