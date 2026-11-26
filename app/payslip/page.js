'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, LoadingState, Logo, api } from '@/components/ui';
import './payslip.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DEFAULT_EARNINGS = [
  { name: 'BASIC', amount: '0' },
  { name: 'HRA', amount: '0' },
  { name: 'DA', amount: '0' },
  { name: 'Conveyance Allowance', amount: '0' },
  { name: 'Special Allowance', amount: '0' },
];
const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

function daysInMonth(month) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month || '');
  return match ? new Date(Number(match[1]), Number(match[2]), 0).getDate() : 0;
}

function weekOffCount(month, weekOffs) {
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

function createDefaultForm() {
  const today = new Date();
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const weekOffs = [0];
  return {
    company: 'Go Kite Travel & Tours LLP',
    logo: '',
    month,
    personId: '',
    name: '',
    employeeId: '',
    designation: '',
    location: '',
    joined: '',
    account: '',
    bank: '',
    present: '0',
    absent: '0',
    halfDays: '0',
    leaves: String(weekOffCount(month, weekOffs)),
    otMinutes: '0',
    fineMinutes: '0',
    autoPresent: true,
    prorate: true,
    weekOffs,
    earnings: DEFAULT_EARNINGS.map((row) => ({ ...row })),
    deductions: [],
  };
}

function attendanceFor(form) {
  const monthDays = daysInMonth(form.month);
  const absent = amount(form.absent);
  const halfDays = amount(form.halfDays);
  const leaves = amount(form.leaves);
  return {
    monthDays,
    payable: Math.max(0, monthDays - absent - (0.5 * halfDays)),
    present: form.autoPresent
      ? Math.max(0, monthDays - leaves - absent - halfDays)
      : amount(form.present),
  };
}

function calculate(form) {
  const attendance = attendanceFor(form);
  const ratio = form.prorate && attendance.monthDays
    ? Math.max(0, Math.min(1, attendance.payable / attendance.monthDays))
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

function amountInWords(value) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const twoDigits = (number) => number < 20
    ? ones[number]
    : `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ''}`;
  const threeDigits = (number) => {
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
  return `${value < 0 ? 'Minus ' : ''}${words.join(' ')}`;
}

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

function PayRowEditor({ title, rows, onChange, onAdd }) {
  return (
    <fieldset className="payslip-fieldset">
      <legend>{title}</legend>
      {rows.map((row, index) => (
        <div className="payslip-edit-row" key={`${title}-${index}`}>
          <input
            aria-label={`${title} name ${index + 1}`}
            maxLength={120}
            placeholder={title === 'Deductions' ? 'e.g. PF' : undefined}
            value={row.name}
            onChange={(event) => onChange(index, 'name', event.target.value)}
          />
          <input
            aria-label={`${title} amount ${index + 1}`}
            type="number"
            min="0"
            max="1000000000"
            step="0.01"
            value={row.amount}
            onChange={(event) => onChange(index, 'amount', event.target.value)}
          />
          <button type="button" aria-label={`Remove ${title.toLowerCase()} ${index + 1}`} onClick={() => onChange(index, null, null)}>×</button>
        </div>
      ))}
      <button className="payslip-add-row" type="button" onClick={onAdd}>+ Add {title === 'Earnings' ? 'earning' : 'deduction'}</button>
    </fieldset>
  );
}

function SavedPayslips({ records, busyId, onOpen, onDelete, onCreate }) {
  if (!records.length) {
    return (
      <section className="payslip-saved card">
        <div className="payslip-empty">
          <Icon n="inbox" s={30} />
          <h2>No saved payslips</h2>
          <p>Save a payslip to create or add to an employee folder.</p>
          <button className="btn primary" onClick={onCreate}>Create a payslip</button>
        </div>
      </section>
    );
  }

  const folders = records.reduce((groups, record) => {
    const key = record.person_id || `${record.employee_id || ''}:${record.employee_name || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
    return groups;
  }, new Map());

  return (
    <section className="payslip-saved card">
      <div className="payslip-saved-heading">
        <div>
          <h2>Employee folders</h2>
          <p className="sm mut">{folders.size} people · {records.length} saved {records.length === 1 ? 'payslip' : 'payslips'}</p>
        </div>
        <button className="btn primary" onClick={onCreate}><Icon n="plus" s={15} /> New payslip</button>
      </div>
      {[...folders.entries()].map(([key, personRecords]) => {
        const person = personRecords[0];
        return (
          <details className="payslip-person-folder" key={key}>
            <summary>
              <span>
                <strong>{person.employee_name || 'Unnamed employee'}</strong>
                <span className="sm mut">{person.employee_id ? ` · ${person.employee_id}` : ''} · Employee folder</span>
              </span>
              <span className="sm mut">{personRecords.length} {personRecords.length === 1 ? 'payslip' : 'payslips'}</span>
            </summary>
            <div className="payslip-folder-records">
              {personRecords.map((record) => (
                <div className="payslip-record-row" key={record.id}>
                  <div>
                    <strong>{record.month} · {record.company_name}</strong>
                    <span className="sm mut">Updated {new Date(record.updated_at).toLocaleString()}</span>
                  </div>
                  <div className="payslip-record-actions">
                    <button className="btn ghost" disabled={busyId === record.id} onClick={() => onOpen(record.id)}>Open</button>
                    <button className="btn ghost danger" disabled={busyId === record.id} onClick={() => onDelete(record)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </section>
  );
}

export default function PayslipGenerator() {
  const router = useRouter();
  const [form, setForm] = useState(createDefaultForm);
  const [people, setPeople] = useState([]);
  const [records, setRecords] = useState([]);
  const [recordId, setRecordId] = useState('');
  const [tab, setTab] = useState('create');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const logoInput = useRef(null);
  const totals = useMemo(() => calculate(form), [form]);
  const loadRecords = useCallback(async () => {
    const [employeeFolders, payslips] = await Promise.all([
      api('/api/hrops/people'),
      api('/api/payslips'),
    ]);
    setPeople(employeeFolders);
    setRecords(payslips);
  }, []);

  useEffect(() => {
    Promise.all([api('/api/auth/me'), api('/api/workspace-modules')])
      .then(async ([admin, modules]) => {
        setIsSuperAdmin(admin.role === 'superadmin');
        if (!modules.some((module) => module.key === 'hrops' && module.enabled)) {
          router.replace('/portal');
          return;
        }
        await loadRecords();
        setLoading(false);
      })
      .catch((loadError) => {
        if (loadError.status === 401) router.replace('/login');
        else {
          setError(loadError.message || 'Could not load the payslip generator.');
          setLoading(false);
        }
      });
  }, [loadRecords, router]);

  useEffect(() => {
    const updateTimestamp = () => setGeneratedAt(new Date());
    window.addEventListener('beforeprint', updateTimestamp);
    const interval = window.setInterval(updateTimestamp, 30_000);
    return () => {
      window.removeEventListener('beforeprint', updateTimestamp);
      window.clearInterval(interval);
    };
  }, []);

  function updateField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'month') next.leaves = String(weekOffCount(value, current.weekOffs));
      if (next.autoPresent && ['month', 'absent', 'halfDays', 'leaves'].includes(key)) {
        const monthDays = daysInMonth(next.month);
        next.present = String(Math.max(0, monthDays - amount(next.leaves) - amount(next.absent) - amount(next.halfDays)));
      }
      return next;
    });
  }

  function updateWeekOff(day, checked) {
    setForm((current) => {
      const weekOffs = checked
        ? [...current.weekOffs, day].sort()
        : current.weekOffs.filter((item) => item !== day);
      const next = { ...current, weekOffs, leaves: String(weekOffCount(current.month, weekOffs)) };
      if (next.autoPresent) {
        next.present = String(Math.max(0, daysInMonth(next.month) - amount(next.leaves) - amount(next.absent) - amount(next.halfDays)));
      }
      return next;
    });
  }

  function updatePayRow(key, index, field, value) {
    setForm((current) => ({
      ...current,
      [key]: field === null
        ? current[key].filter((_, rowIndex) => rowIndex !== index)
        : current[key].map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
    }));
  }

  function startNew() {
    setForm(createDefaultForm());
    setRecordId('');
    setTab('create');
    setError('');
    setNotice('');
    if (logoInput.current) logoInput.current.value = '';
  }

  function selectPerson(personId) {
    const person = people.find((item) => item.id === personId);
    if (!person) {
      setForm((current) => ({
        ...current,
        personId: '',
        name: '',
        employeeId: '',
        designation: '',
        location: '',
        joined: '',
        account: '',
        bank: '',
      }));
      return;
    }
    const profile = person.profile || {};
    setForm((current) => ({
      ...current,
      personId: person.id,
      name: person.name,
      employeeId: person.employee_id || '',
      designation: profile.designation || '',
      location: profile.workLocation || '',
      joined: profile.dateJoined || '',
      account: profile.bankAccountNumber || '',
      bank: profile.bankName || '',
    }));
  }

  async function savePayslip() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api(recordId ? `/api/payslips/${recordId}` : '/api/payslips', {
        method: recordId ? 'PUT' : 'POST',
        body: form,
      });
      setRecordId(saved.id);
      setForm((current) => ({ ...current, personId: saved.person_id }));
      setNotice(recordId ? 'Payslip changes saved in the employee folder.' : 'Payslip saved in the employee folder.');
      try {
        await loadRecords();
      } catch (refreshError) {
        setError(`Payslip saved, but employee folders could not refresh: ${refreshError.message}`);
      }
    } catch (saveError) {
      setError(saveError.message || 'Could not save this payslip.');
    } finally {
      setBusy(false);
    }
  }

  async function openPayslip(id) {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const saved = await api(`/api/payslips/${id}`);
      setForm({ ...saved.data, personId: saved.person_id });
      setRecordId(saved.id);
      setTab('create');
      setNotice('Saved payslip loaded. Save changes to update it.');
    } catch (loadError) {
      setError(loadError.message || 'Could not open this payslip.');
    } finally {
      setBusyId('');
    }
  }

  async function deletePayslip(record) {
    if (!window.confirm(`Delete the ${record.month} payslip for ${record.employee_name || 'this employee'}? This cannot be undone.`)) return;
    setBusyId(record.id);
    setError('');
    setNotice('');
    try {
      await api(`/api/payslips/${record.id}`, { method: 'DELETE' });
      setRecords((current) => current.filter((item) => item.id !== record.id));
      if (recordId === record.id) startNew();
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete this payslip.');
    } finally {
      setBusyId('');
    }
  }

  function resetForm() {
    if (!window.confirm('Clear this draft? Any saved payslip will stay unchanged unless you save over it.')) return;
    setForm(createDefaultForm());
    setRecordId('');
    setError('');
    setNotice('');
    if (logoInput.current) logoInput.current.value = '';
  }

  async function readLogo(event) {
    const file = event.target.files?.[0];
    if (!file) {
      updateField('logo', '');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5_000_000) {
      setError('Choose a PNG, JPEG, or WebP logo smaller than 5 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Could not read the selected image.'));
      });
      const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not process the selected logo.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const logo = canvas.toDataURL('image/webp', 0.82);
      if (logo.length > 700_000) throw new Error('Logo image is still too large. Choose a smaller image.');
      updateField('logo', logo);
    } catch (logoError) {
      setError(logoError.message || 'Could not process the selected logo.');
      event.target.value = '';
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function printPayslip() {
    setGeneratedAt(new Date());
    window.requestAnimationFrame(() => window.print());
  }

  const calendarDays = useMemo(() => {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(form.month || '');
    if (!match) return [];
    const year = Number(match[1]);
    const month = Number(match[2]);
    const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    return [
      ...Array.from({ length: firstDay }, (_, index) => ({ key: `blank-${index}`, blank: true })),
      ...Array.from({ length: daysInMonth(form.month) }, (_, index) => ({
        key: `day-${index + 1}`,
        day: index + 1,
        weekOff: form.weekOffs.includes(new Date(Date.UTC(year, month - 1, index + 1)).getUTCDay()),
      })),
    ];
  }, [form.month, form.weekOffs]);

  if (loading) return <LoadingState label="Loading payslip generator" />;

  return (
    <div className="page-shell payslip-page-shell">
      <div className="shell-panel workspace-panel payslip-workspace-panel">
        <div className="bar payslip-header">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={44} />
            <span className="payslip-brand-title">HROps · Payslip Generator</span>
          </div>
          <div className="me">
            <button className="btn ghost" onClick={() => router.push('/hrops')}>HROps</button>
            {isSuperAdmin && <button className="btn ghost" onClick={() => router.push('/super-admin')}>Super admin</button>}
          </div>
        </div>

        <div className="payslip-heading">
          <div>
            <h1>{tab === 'create' ? 'Salary slip generator' : 'Saved payslips'}</h1>
            <p className="sm mut">{tab === 'create' ? 'Review attendance and salary details in the live A4 preview, then save or print as PDF.' : 'Open payslips from employee folders, or create a new one.'}</p>
          </div>
        </div>

        {error && <p className="err" role="alert">{error}</p>}
        {notice && <p className="payslip-notice" role="status">{notice}</p>}

        <div className="payslip-tabs" role="tablist" aria-label="Payslip sections">
          <button role="tab" aria-selected={tab === 'create'} className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>
            Create payslip
          </button>
          <button role="tab" aria-selected={tab === 'saved'} className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>
            Saved payslips <span>{records.length}</span>
          </button>
        </div>

        {tab === 'saved' ? (
          <SavedPayslips records={records} busyId={busyId} onOpen={openPayslip} onDelete={deletePayslip} onCreate={startNew} />
        ) : (
        <div className="payslip-layout">
          <aside className="payslip-panel card" aria-label="Payslip details">
            <h2>Salary slip details</h2>
            <label htmlFor="payslip-company">Company name</label>
            <input id="payslip-company" maxLength={180} value={form.company} onChange={(event) => updateField('company', event.target.value)} />
            <label htmlFor="payslip-logo">Logo (optional)</label>
            <input ref={logoInput} id="payslip-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={readLogo} />

            <div className="payslip-grid-2">
              <div>
                <label htmlFor="payslip-month">Month</label>
                <input id="payslip-month" type="month" value={form.month} onChange={(event) => updateField('month', event.target.value)} />
              </div>
              <div>
                <label htmlFor="payslip-payable">Payable days</label>
                <input id="payslip-payable" type="number" value={totals.attendance.payable} readOnly aria-describedby="payslip-payable-hint" />
              </div>
            </div>
            <p id="payslip-payable-hint" className="payslip-hint">Calculated from days in the month, absences, and half days.</p>

            <h3>Employee</h3>
            <label htmlFor="payslip-person">Employee folder</label>
            <select id="payslip-person" value={form.personId} onChange={(event) => selectPerson(event.target.value)}>
              <option value="">New employee folder</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}{person.employee_id ? ` · ${person.employee_id}` : ''}
                </option>
              ))}
            </select>
            <p className="payslip-hint">{form.personId ? 'This payslip will be saved in the selected employee folder.' : 'Enter a name to create a new employee folder when saving.'}</p>
            <label htmlFor="payslip-name">Name</label>
            <input id="payslip-name" maxLength={180} value={form.name} disabled={Boolean(form.personId)} onChange={(event) => updateField('name', event.target.value)} />
            <label htmlFor="payslip-employee-id">Employee ID</label>
            <input id="payslip-employee-id" maxLength={80} value={form.employeeId} disabled={Boolean(form.personId)} onChange={(event) => updateField('employeeId', event.target.value)} />
            <label htmlFor="payslip-designation">Designation</label>
            <input id="payslip-designation" maxLength={120} value={form.designation} onChange={(event) => updateField('designation', event.target.value)} />
            <label htmlFor="payslip-location">Work location</label>
            <input id="payslip-location" maxLength={180} value={form.location} onChange={(event) => updateField('location', event.target.value)} />
            <label htmlFor="payslip-joined">Date joined</label>
            <input id="payslip-joined" type="date" value={form.joined} onChange={(event) => updateField('joined', event.target.value)} />
            <label htmlFor="payslip-account">Bank account number</label>
            <input id="payslip-account" maxLength={40} value={form.account} onChange={(event) => updateField('account', event.target.value)} />
            <label htmlFor="payslip-bank">Bank name</label>
            <input id="payslip-bank" maxLength={120} value={form.bank} onChange={(event) => updateField('bank', event.target.value)} />

            <h3>Week offs (added to leaves)</h3>
            <div className="payslip-weekdays">
              {WEEKDAYS.map((day, index) => (
                <label key={day}>
                  <input type="checkbox" checked={form.weekOffs.includes(index)} onChange={(event) => updateWeekOff(index, event.target.checked)} />
                  {day}
                </label>
              ))}
            </div>
            <div className="payslip-calendar" aria-label="Calendar showing selected week offs">
              {WEEKDAYS.map((day) => <span className="payslip-calendar-heading" key={day}>{day[0]}</span>)}
              {calendarDays.map((item) => (
                <span key={item.key} className={item.weekOff ? 'payslip-week-off' : ''}>{item.day || ''}</span>
              ))}
            </div>

            <h3>Attendance</h3>
            <div className="payslip-grid-3">
              <div><label htmlFor="payslip-present">Present</label><input id="payslip-present" type="number" min="0" max="31" step="0.5" disabled={form.autoPresent} value={totals.attendance.present} onChange={(event) => updateField('present', event.target.value)} /></div>
              <div><label htmlFor="payslip-absent">Absent</label><input id="payslip-absent" type="number" min="0" max="31" step="0.5" value={form.absent} onChange={(event) => updateField('absent', event.target.value)} /></div>
              <div><label htmlFor="payslip-half-days">Half days</label><input id="payslip-half-days" type="number" min="0" max="31" step="1" value={form.halfDays} onChange={(event) => updateField('halfDays', event.target.value)} /></div>
              <div><label htmlFor="payslip-leaves">Leaves</label><input id="payslip-leaves" type="number" min="0" max="31" step="1" value={form.leaves} onChange={(event) => updateField('leaves', event.target.value)} /></div>
              <div><label htmlFor="payslip-ot">OT mins</label><input id="payslip-ot" type="number" min="0" max="1000000" value={form.otMinutes} onChange={(event) => updateField('otMinutes', event.target.value)} /></div>
              <div><label htmlFor="payslip-fine">Fine mins</label><input id="payslip-fine" type="number" min="0" max="1000000" value={form.fineMinutes} onChange={(event) => updateField('fineMinutes', event.target.value)} /></div>
            </div>
            <label className="payslip-check">
              <input type="checkbox" checked={form.autoPresent} onChange={(event) => updateField('autoPresent', event.target.checked)} />
              Auto-calculate present days (month days − leaves − absent − half days)
            </label>
            <label className="payslip-check">
              <input type="checkbox" checked={form.prorate} onChange={(event) => updateField('prorate', event.target.checked)} />
              Pro-rate earned wages (payable days ÷ days in month)
            </label>

            <PayRowEditor
              title="Earnings"
              rows={form.earnings}
              onChange={(index, field, value) => updatePayRow('earnings', index, field, value)}
              onAdd={() => setForm((current) => ({ ...current, earnings: [...current.earnings, { name: '', amount: '0' }] }))}
            />
            <PayRowEditor
              title="Deductions"
              rows={form.deductions}
              onChange={(index, field, value) => updatePayRow('deductions', index, field, value)}
              onAdd={() => setForm((current) => ({ ...current, deductions: [...current.deductions, { name: '', amount: '0' }] }))}
            />

            <p className="payslip-hint">The footer timestamp updates automatically when you print or save.</p>
            <button className="btn primary" disabled={busy} onClick={savePayslip}>
              <Icon n="file" s={15} />{busy ? 'Saving…' : recordId ? 'Save changes' : 'Save payslip'}
            </button>
            <button className="btn primary" onClick={printPayslip}><Icon n="file" s={15} />Print / Save as PDF</button>
            <button className="btn ghost payslip-reset" onClick={resetForm}>Clear draft</button>
          </aside>

          <main className="payslip-preview" aria-label="Payslip preview">
            <article className="payslip-paper">
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
          </main>
        </div>
        )}
      </div>
    </div>
  );
}
