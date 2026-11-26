'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Logo, LoadingState, api } from '@/components/ui';
import { amountInWords, calculateFnf as calculate } from '@/lib/fnf-calculations';
import {
  ALL_FOLDERS_ZIP_CONFIRMATION,
  FOLDER_PDF_CONFIRMATION,
  canShareHropsFolderPdf,
  downloadHropsFolderPdf,
  prepareAllHropsFoldersZip,
  prepareHropsFolderPdf,
  sharePreparedHropsFolderPdf,
} from '@/lib/hrops-folder-pdf';
import './fnf.css';

const DEFAULT_COMPONENTS = [
  ['BASIC', 15012],
  ['HRA', 5000],
  ['DA', 4888],
  ['CONVEYANCE ALLOWANCE', 1500],
  ['MEDICAL ALLOWANCE', 1500],
  ['SPECIAL ALLOWANCE', 2100],
];
const DEFAULT_DEDUCTIONS = [
  ['Professional Tax', 0],
  ['Asset Recovery', 0],
  ['Advanced Deduction', 0],
  ['Other Deduction', 0],
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NUMBER_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const inr = (value) => NUMBER_FORMAT.format(Number.isFinite(value) ? value : 0);
const dateParts = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
};
const displayDate = (value) => {
  const date = dateParts(value);
  return date ? `${String(date.day).padStart(2, '0')}-${String(date.month).padStart(2, '0')}-${date.year}` : '—';
};
const monthLabel = (month) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return '—';
  return `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
};
const daysInCalendarMonth = (month) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return 30;
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
};

function automaticPayableDays(month, data) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return 0;
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const monthIndex = year * 12 + monthNumber;
  const calendarDays = daysInCalendarMonth(month);
  let startDay = 1;
  let endDay = calendarDays;
  const joining = dateParts(data.dateOfJoining);
  const lastDay = dateParts(data.lastWorkingDay);

  if (joining) {
    const joiningMonth = joining.year * 12 + joining.month;
    if (joiningMonth > monthIndex) endDay = 0;
    else if (joiningMonth === monthIndex) startDay = joining.day;
  }
  if (lastDay) {
    const leavingMonth = lastDay.year * 12 + lastDay.month;
    if (leavingMonth < monthIndex) endDay = 0;
    else if (leavingMonth === monthIndex) endDay = Math.min(endDay, lastDay.day);
  }

  let payableDays = Math.max(0, endDay - startDay + 1);
  if (data.basis !== 'cal') {
    const fixedBasis = Number(data.basis);
    payableDays = startDay === 1 && endDay === calendarDays
      ? fixedBasis
      : Math.min(payableDays, fixedBasis);
  }
  return payableDays;
}

function makePeriod(month, data, payableDaysTouched = false) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) {
    return {
      month: '',
      payableDays: 0,
      daysInMonth: data.basis === 'cal' ? 30 : Number(data.basis),
      payableDaysTouched: false,
    };
  }
  const daysInMonth = data.basis === 'cal' ? daysInCalendarMonth(month) : Number(data.basis);
  return {
    month,
    payableDays: payableDaysTouched ? 0 : automaticPayableDays(month, data),
    daysInMonth,
    payableDaysTouched,
  };
}

function createDefaultData() {
  const today = new Date();
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const data = {
    personId: '',
    companyName: 'Go Kite Travel & Tours LLP',
    companyLogo: '',
    employeeName: '',
    employeeId: '',
    department: '',
    designation: '',
    dateOfJoining: '',
    lastWorkingDay: '',
    lastWorkingDay: '',
    periods: [],
    rounding: 'near',
    basis: 'cal',
    components: DEFAULT_COMPONENTS.map((row) => [...row]),
    additionalPayments: [],
    deductions: DEFAULT_DEDUCTIONS.map((row) => [...row]),
    lineSpacing: 'normal',
    watermarkEnabled: false,
    watermarkType: 'logo',
    watermarkText: 'CONFIDENTIAL',
    watermarkStrength: 10,
    footerNote: '',
    noteTouched: false,
  };
  data.periods = [makePeriod(month, data)];
  return data;
}

function updateRows(rows, index, column, value) {
  return rows.map((row, rowIndex) => rowIndex === index
    ? row.map((cell, cellIndex) => cellIndex === column ? value : cell)
    : row);
}

function RowsEditor({ title, rows, onChange, addLabel }) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {rows.map(([name, amount], index) => (
        <div className="fnf-edit-row" key={`${title}-${index}`}>
          <input
            aria-label={`${title} name ${index + 1}`}
            value={name}
            maxLength={120}
            onChange={(event) => onChange(updateRows(rows, index, 0, event.target.value))}
          />
          <input
            aria-label={`${title} amount ${index + 1}`}
            type="number"
            min="0"
            max="1000000000"
            step="0.01"
            value={amount}
            onChange={(event) => onChange(updateRows(rows, index, 1, Number(event.target.value) || 0))}
          />
          <button type="button" aria-label={`Remove ${title.toLowerCase()} ${index + 1}`} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>×</button>
        </div>
      ))}
      <button type="button" className="fnf-add-row" onClick={() => onChange([...rows, ['', 0]])}>+ {addLabel}</button>
    </fieldset>
  );
}

function SettlementPaper({ data, totals }) {
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

function SavedSettlements({
  people,
  records,
  busyId,
  sharingId,
  downloadingId,
  preparedShareId,
  bulkDownloading,
  bulkDownloadProgress,
  onOpen,
  onDelete,
  onCreate,
  onShare,
  onDownload,
  onDownloadAll,
}) {
  const [openFolderKey, setOpenFolderKey] = useState(null);
  if (!records.length) {
    return (
      <div className="fnf-empty">
        <Icon n="inbox" s={30} />
        <h2>No saved settlements</h2>
        <p>Created F&amp;F statements will be kept here for later viewing, editing, and printing.</p>
        <div className="hrops-folder-bulk-actions">
          {people.length > 0 && (
            <button className="btn ghost" disabled={bulkDownloading} onClick={onDownloadAll}>
              <Icon n="download" s={15} />{bulkDownloading ? bulkDownloadProgress || 'Preparing ZIP…' : 'Download all folders (ZIP)'}
            </button>
          )}
          <button className="btn primary" onClick={onCreate}>Create your first settlement</button>
        </div>
      </div>
    );
  }

  const folders = records.reduce((groups, record) => {
    const key = record.person_id || `${record.employee_id || ''}:${record.employee_name || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
    return groups;
  }, new Map());
  const selectedRecords = folders.get(openFolderKey);
  const selectedPerson = selectedRecords?.[0];

  return (
    <section className="fnf-records card">
      <div className="fnf-records-heading">
        <div>
          <h2>Employee folders</h2>
          <p className="sm mut">{folders.size} people · {records.length} saved {records.length === 1 ? 'settlement' : 'settlements'}</p>
        </div>
        <div className="hrops-folder-bulk-actions">
          <button className="btn ghost" disabled={bulkDownloading} onClick={onDownloadAll}>
            <Icon n="download" s={15} />{bulkDownloading ? bulkDownloadProgress || 'Preparing ZIP…' : 'Download all folders (ZIP)'}
          </button>
          <button className="btn primary" onClick={onCreate}><Icon n="plus" s={15} /> New settlement</button>
        </div>
      </div>
      {selectedPerson ? (
        <>
          <nav className="hrops-file-manager-nav" aria-label="Folder location">
            <button type="button" className="btn ghost" onClick={() => setOpenFolderKey(null)}>
              <Icon n="back" s={15} /> Employee folders
            </button>
            <span aria-hidden="true">/</span>
            <span className="hrops-folder-breadcrumb"><Icon n="folder" s={17} />{selectedPerson.employee_name || 'Unnamed employee'}</span>
          </nav>
          <div className="hrops-folder-toolbar">
            <div className="hrops-folder-toolbar-copy">
              <strong>Files</strong>
              <span className="sm mut">{selectedRecords.length} {selectedRecords.length === 1 ? 'settlement' : 'settlements'}</span>
            </div>
            {selectedPerson.person_id && (
              <div className="hrops-folder-toolbar-actions">
                <button className="btn ghost" disabled={sharingId === selectedPerson.person_id || downloadingId === selectedPerson.person_id} onClick={() => onDownload(selectedPerson.person_id)}>
                  <Icon n="download" s={15} />{downloadingId === selectedPerson.person_id ? 'Preparing PDF…' : 'Download PDF'}
                </button>
                <button className="btn ghost" disabled={sharingId === selectedPerson.person_id || downloadingId === selectedPerson.person_id} onClick={() => onShare(selectedPerson.person_id)}>
                  <Icon n="share" s={15} />
                  {sharingId === selectedPerson.person_id
                    ? preparedShareId === selectedPerson.person_id ? 'Opening share menu…' : 'Preparing PDF…'
                    : preparedShareId === selectedPerson.person_id ? 'Share PDF now' : 'Share folder PDF'}
                </button>
              </div>
            )}
          </div>
          <div className="hrops-files-grid">
            {selectedRecords.map((record) => (
              <article className="hrops-file-tile" key={record.id}>
                <span className="hrops-file-icon"><Icon n="file" s={27} /></span>
                <div className="hrops-file-info">
                  <strong>Full &amp; Final Settlement</strong>
                  <span className="sm mut">{record.company_name} · Updated {new Date(record.updated_at).toLocaleString()}</span>
                </div>
                <div className="hrops-file-actions">
                  <button className="btn ghost" disabled={busyId === record.id} onClick={() => onOpen(record.id)}>Open</button>
                  <button className="btn ghost danger" disabled={busyId === record.id} onClick={() => onDelete(record)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="hrops-folder-grid">
          {[...folders.entries()].map(([key, personRecords]) => {
            const person = personRecords[0];
            return (
              <button type="button" className="hrops-folder-card" key={key} onClick={() => setOpenFolderKey(key)}>
                <span className="hrops-folder-card-count">{personRecords.length} {personRecords.length === 1 ? 'item' : 'items'}</span>
                <span className="hrops-folder-icon"><Icon n="folder" s={30} /></span>
                <span className="hrops-folder-info">
                  <strong>{person.employee_name || 'Unnamed employee'}</strong>
                  <span className="sm mut">{person.employee_id ? `ID ${person.employee_id} · ` : ''}Employee folder</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function FnfPage() {
  const router = useRouter();
  const [form, setForm] = useState(createDefaultData);
  const [records, setRecords] = useState([]);
  const [people, setPeople] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [tab, setTab] = useState('create');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [sharingId, setSharingId] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const [preparedShare, setPreparedShare] = useState(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const totals = useMemo(() => calculate(form), [form]);

  const loadRecords = useCallback(async () => {
    const [settlements, employeeFolders] = await Promise.all([
      api('/api/fnfs'),
      api('/api/hrops/people'),
    ]);
    setRecords(settlements);
    setPeople(employeeFolders);
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
          setError(loadError.message || 'Could not load F&F settlements.');
          setLoading(false);
        }
      });
  }, [loadRecords, router]);

  function startNew() {
    setForm(createDefaultData());
    setRecordId('');
    setTab('create');
    setError('');
    setNotice('');
  }

  async function openRecord(id) {
    setBusyId(id);
    setError('');
    try {
      const record = await api(`/api/fnfs/${id}`);
      setForm({ ...record.data, personId: record.person_id || record.data.personId || '' });
      setRecordId(record.id);
      setTab('create');
      setNotice('Saved settlement loaded. Save changes to update this record.');
    } catch (loadError) {
      setError(loadError.message || 'Could not open this settlement.');
    } finally {
      setBusyId('');
    }
  }

  async function saveSettlement() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api(recordId ? `/api/fnfs/${recordId}` : '/api/fnfs', {
        method: recordId ? 'PUT' : 'POST',
        body: form,
      });
      setRecordId(saved.id);
      setNotice(recordId ? 'Settlement changes saved.' : 'Settlement saved to your records.');
      await loadRecords();
    } catch (saveError) {
      setError(saveError.message || 'Could not save this settlement.');
    } finally {
      setBusy(false);
    }
  }

  async function shareFolder(personId) {
    if (preparedShare?.personId === personId) {
      setSharingId(personId);
      setError('');
      setNotice('');
      try {
        const result = await sharePreparedHropsFolderPdf(preparedShare);
        if (result === 'shared') {
          setPreparedShare(null);
          setNotice('Employee folder PDF shared.');
        } else {
          setNotice('Sharing canceled.');
        }
      } catch (shareError) {
        setError(shareError.message || 'Could not share this employee folder PDF.');
      } finally {
        setSharingId('');
      }
      return;
    }

    if (!window.confirm(FOLDER_PDF_CONFIRMATION)) return;
    setPreparedShare(null);
    setSharingId(personId);
    setError('');
    setNotice('');
    try {
      const prepared = await prepareHropsFolderPdf(personId);
      if (canShareHropsFolderPdf(prepared.file)) {
        setPreparedShare({ personId, ...prepared });
        setNotice('Employee folder PDF is ready. Tap “Share PDF now” to choose a sharing app.');
      } else {
        downloadHropsFolderPdf(prepared.file);
        setNotice('Employee folder PDF downloaded. You can now share the file securely.');
      }
    } catch (shareError) {
      setError(shareError.message || 'Could not prepare this employee folder PDF.');
    } finally {
      setSharingId('');
    }
  }

  async function downloadFolderPdf(personId) {
    if (!window.confirm(FOLDER_PDF_CONFIRMATION)) return;
    setDownloadingId(personId);
    setError('');
    setNotice('');
    try {
      const prepared = preparedShare?.personId === personId
        ? preparedShare
        : await prepareHropsFolderPdf(personId);
      downloadHropsFolderPdf(prepared.file);
      setPreparedShare(null);
      setNotice('Employee folder PDF downloaded.');
    } catch (downloadError) {
      setError(downloadError.message || 'Could not download this employee folder PDF.');
    } finally {
      setDownloadingId('');
    }
  }

  async function downloadAllFolders() {
    if (!window.confirm(ALL_FOLDERS_ZIP_CONFIRMATION)) return;
    setBulkDownloading(true);
    setBulkDownloadProgress('Fetching folders…');
    setError('');
    setNotice('');
    try {
      const zipFile = await prepareAllHropsFoldersZip((progress) => {
        setBulkDownloadProgress(progress.phase === 'folders'
          ? `Preparing folders ${progress.completed}/${progress.total}…`
          : `Compressing ZIP ${Math.floor(progress.percent || 0)}%…`);
      });
      downloadHropsFolderPdf(zipFile);
      setNotice('All employee folders downloaded as a ZIP.');
    } catch (downloadError) {
      setError(downloadError.message || 'Could not download all employee folders.');
    } finally {
      setBulkDownloading(false);
      setBulkDownloadProgress('');
    }
  }

  async function deleteSettlement(record) {
    if (!window.confirm(`Delete the F&F settlement for ${record.employee_name || 'this employee'}? This cannot be undone.`)) return;
    setBusyId(record.id);
    setError('');
    try {
      await api(`/api/fnfs/${record.id}`, { method: 'DELETE' });
      setRecords((current) => current.filter((item) => item.id !== record.id));
      if (recordId === record.id) startNew();
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete this settlement.');
    } finally {
      setBusyId('');
    }
  }

  function updateField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'dateOfJoining' || key === 'lastWorkingDay') {
        next.periods = current.periods.map((period) => period.payableDaysTouched
          ? period
          : makePeriod(period.month, next));
      }
      if (key === 'basis') {
        next.periods = current.periods.map((period) => makePeriod(period.month, next));
      }
      return next;
    });
  }

  function selectPerson(personId) {
    const person = people.find((item) => item.id === personId);
    if (!person) {
      setForm((current) => ({
        ...current,
        personId: '',
        employeeName: '',
        employeeId: '',
        department: '',
        designation: '',
        dateOfJoining: '',
      }));
      return;
    }
    const profile = person.profile || {};
    setForm((current) => ({
      ...current,
      personId: person.id,
      employeeName: person.name,
      employeeId: person.employee_id || '',
      department: profile.department || '',
      designation: profile.designation || '',
      dateOfJoining: profile.dateJoined || '',
    }));
  }

  function updatePeriod(index, key, value) {
    setForm((current) => ({
      ...current,
      periods: current.periods.map((period, periodIndex) => {
        if (periodIndex !== index) return period;
        if (key === 'month') return makePeriod(value, current);
        return {
          ...period,
          [key]: value,
          ...(key === 'payableDays' ? { payableDaysTouched: true } : {}),
        };
      }),
    }));
  }

  function addMonth() {
    setForm((current) => {
      const existing = current.periods.map((period) => period.month).filter(Boolean).sort();
      const date = existing.length ? new Date(`${existing[existing.length - 1]}-01T00:00:00`) : new Date();
      date.setMonth(date.getMonth() + 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return { ...current, periods: [...current.periods, makePeriod(month, current)] };
    });
  }

  async function updateLogo(file) {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/') || file.size > 5_000_000) {
      setError('Choose an image smaller than 5 MB.');
      return;
    }
    try {
      const objectUrl = URL.createObjectURL(file);
      let logo;
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
        if (!context) throw new Error('Could not process the selected image.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        logo = canvas.toDataURL('image/webp', 0.82);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      if (logo.length > 700_000) throw new Error('Logo image is still too large. Choose a smaller image.');
      setForm((current) => ({ ...current, companyLogo: logo }));
    } catch (logoError) {
      setError(logoError.message || 'Could not process the logo image.');
    }
  }

  function clearForm() {
    if (!window.confirm('Clear this settlement and start a blank one? Unsaved edits will be lost.')) return;
    startNew();
  }

  if (loading) return <LoadingState label="Loading F&F settlements" />;

  return (
    <div className="page-shell fnf-page-shell">
      <div className="shell-panel workspace-panel fnf-workspace-panel">
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={44} />
            <span className="fnf-brand-title">HROps · Full &amp; Final Settlement</span>
          </div>
          <div className="me">
            <button className="btn ghost" aria-label="Back to HROps" onClick={() => router.push('/hrops')}>
              <Icon n="back" s={15} />Back
            </button>
            <button className="btn ghost" aria-label="Go to workspace home" onClick={() => router.push('/portal')}>
              <Icon n="home" s={15} />Home
            </button>
            {isSuperAdmin && <button className="btn ghost" onClick={() => router.push('/super-admin')}>Super admin</button>}
          </div>
        </div>

        <div className="fnf-heading">
          <div>
            <h1>Full &amp; Final Settlement</h1>
            <p className="sm mut">Create, save, and print employee settlement statements.</p>
          </div>
          <button className="btn primary" onClick={startNew}><Icon n="plus" s={15} /> New settlement</button>
        </div>

        {error && <p className="err" role="alert">{error}</p>}
        {notice && <p className="fnf-notice" role="status">{notice}</p>}

        <div className="seg fnf-tabs" role="tablist" aria-label="F&F sections">
          <button role="tab" aria-selected={tab === 'create'} onClick={() => setTab('create')}>Create settlement</button>
          <button role="tab" aria-selected={tab === 'saved'} onClick={() => setTab('saved')}>Saved settlements <b>{records.length}</b></button>
        </div>

        {tab === 'saved' ? (
          <SavedSettlements
            people={people}
            records={records}
            busyId={busyId}
            sharingId={sharingId}
            downloadingId={downloadingId}
            preparedShareId={preparedShare?.personId}
            bulkDownloading={bulkDownloading}
            bulkDownloadProgress={bulkDownloadProgress}
            onOpen={openRecord}
            onDelete={deleteSettlement}
            onCreate={startNew}
            onShare={shareFolder}
            onDownload={downloadFolderPdf}
            onDownloadAll={downloadAllFolders}
          />
        ) : (
          <div className="fnf-builder">
            <aside className="fnf-controls">
              <div className="fnf-edit-heading">
                <div>
                  <h2>{recordId ? 'Edit saved settlement' : 'Settlement details'}</h2>
                  {recordId && <p className="sm mut">Editing a saved record</p>}
                </div>
              </div>

              <fieldset>
                <legend>Company</legend>
                <label htmlFor="fnf-company">Company name</label>
                <input id="fnf-company" maxLength={180} value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} />
                <label htmlFor="fnf-logo">Logo (optional image)</label>
                <input id="fnf-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => updateLogo(event.target.files?.[0])} />
                {form.companyLogo && <button className="fnf-text-button" type="button" onClick={() => updateField('companyLogo', '')}>Remove logo</button>}
              </fieldset>

              <fieldset>
                <legend>Employee</legend>
                <label htmlFor="fnf-person">Employee folder</label>
                <select id="fnf-person" value={form.personId || ''} onChange={(event) => selectPerson(event.target.value)}>
                  <option value="">New employee folder</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}{person.employee_id ? ` · ${person.employee_id}` : ''}
                    </option>
                  ))}
                </select>
                <p className="fnf-hint">{form.personId ? 'This settlement will be saved in the selected employee folder.' : 'Enter an employee name or ID to match or create a folder when saving.'}</p>
                <label htmlFor="fnf-name">Employee name</label>
                <input id="fnf-name" maxLength={180} value={form.employeeName} disabled={Boolean(form.personId)} onChange={(event) => updateField('employeeName', event.target.value)} />
                <div className="fnf-two-col">
                  <div><label htmlFor="fnf-id">Employee ID</label><input id="fnf-id" maxLength={80} value={form.employeeId} disabled={Boolean(form.personId)} onChange={(event) => updateField('employeeId', event.target.value)} /></div>
                  <div><label htmlFor="fnf-dept">Department</label><input id="fnf-dept" maxLength={120} value={form.department} onChange={(event) => updateField('department', event.target.value)} /></div>
                </div>
                <label htmlFor="fnf-designation">Designation</label>
                <input id="fnf-designation" maxLength={120} value={form.designation} onChange={(event) => updateField('designation', event.target.value)} />
                <div className="fnf-two-col">
                  <div><label htmlFor="fnf-doj">Date of joining</label><input id="fnf-doj" type="date" value={form.dateOfJoining} onChange={(event) => updateField('dateOfJoining', event.target.value)} /></div>
                  <div><label htmlFor="fnf-lwd">Last working day</label><input id="fnf-lwd" type="date" value={form.lastWorkingDay} onChange={(event) => updateField('lastWorkingDay', event.target.value)} /></div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Salary months</legend>
                <div className="fnf-month-head"><span>Month</span><span>Payable days</span><span>Days in month</span><span /></div>
                {form.periods.map((period, index) => (
                  <div className="fnf-month-row" key={`${index}-${period.month}`}>
                    <input type="month" aria-label={`Salary month ${index + 1}`} value={period.month} onChange={(event) => updatePeriod(index, 'month', event.target.value)} />
                    <input type="number" aria-label={`Payable days for ${monthLabel(period.month)}`} min="0" max="31" step="0.5" value={period.payableDays} onChange={(event) => updatePeriod(index, 'payableDays', Number(event.target.value) || 0)} />
                    <input type="number" aria-label={`Days in ${monthLabel(period.month)}`} min="1" max="31" value={period.daysInMonth} onChange={(event) => updatePeriod(index, 'daysInMonth', Number(event.target.value) || 1)} />
                    <button type="button" aria-label={`Remove ${monthLabel(period.month)}`} disabled={form.periods.length < 2} onClick={() => setForm((current) => ({ ...current, periods: current.periods.filter((_, itemIndex) => itemIndex !== index) }))}>×</button>
                  </div>
                ))}
                <button className="fnf-add-row" type="button" onClick={addMonth}>+ Add month</button>
                <label htmlFor="fnf-rounding">Rounding</label>
                <select id="fnf-rounding" value={form.rounding} onChange={(event) => updateField('rounding', event.target.value)}>
                  <option value="near">Round to nearest rupee</option><option value="down">Round down each line</option><option value="up">Round up each line</option>
                </select>
                <label htmlFor="fnf-basis">Days basis</label>
                <select id="fnf-basis" value={form.basis} onChange={(event) => updateField('basis', event.target.value)}>
                  <option value="cal">Actual days in the month</option><option value="30">Fixed 30 days</option><option value="26">Fixed 26 days</option>
                </select>
                <p className="fnf-hint">Each salary component is prorated for each month. Payable days are calculated from joining and last working dates; adjust them if needed.</p>
              </fieldset>

              <RowsEditor title="Monthly gross salary" rows={form.components} onChange={(rows) => updateField('components', rows)} addLabel="Add component" />
              <RowsEditor title="Additional payments" rows={form.additionalPayments} onChange={(rows) => updateField('additionalPayments', rows)} addLabel="Add payment" />
              <p className="fnf-hint">Leave encashment, bonus, notice pay, and similar payments are added as entered.</p>
              <RowsEditor title="Deductions" rows={form.deductions} onChange={(rows) => updateField('deductions', rows)} addLabel="Add deduction" />

              <fieldset>
                <legend>Layout &amp; watermark</legend>
                <label htmlFor="fnf-spacing">Line spacing</label>
                <select id="fnf-spacing" value={form.lineSpacing} onChange={(event) => updateField('lineSpacing', event.target.value)}>
                  <option value="compact">Compact</option><option value="normal">Comfortable</option><option value="roomy">Spacious</option>
                </select>
                <label className="fnf-check"><input type="checkbox" checked={form.watermarkEnabled} onChange={(event) => updateField('watermarkEnabled', event.target.checked)} /> Show watermark</label>
                <label htmlFor="fnf-watermark-type">Watermark type</label>
                <select id="fnf-watermark-type" value={form.watermarkType} onChange={(event) => updateField('watermarkType', event.target.value)}>
                  <option value="logo">Company logo</option><option value="text">Custom text</option>
                </select>
                {form.watermarkType === 'text' && <>
                  <label htmlFor="fnf-watermark-text">Watermark text</label>
                  <input id="fnf-watermark-text" maxLength={120} value={form.watermarkText} onChange={(event) => updateField('watermarkText', event.target.value)} />
                </>}
                <label htmlFor="fnf-watermark-strength">Strength: {form.watermarkStrength}%</label>
                <input id="fnf-watermark-strength" type="range" min="4" max="30" value={form.watermarkStrength} onChange={(event) => updateField('watermarkStrength', Number(event.target.value))} />
                <p className="fnf-hint">Without an uploaded company logo, the company name is used as the watermark.</p>
              </fieldset>

              <fieldset>
                <legend>Footer note</legend>
                <textarea maxLength={2000} value={form.footerNote} onChange={(event) => setForm((current) => ({ ...current, footerNote: event.target.value, noteTouched: true }))} />
              </fieldset>

              <div className="fnf-actions">
                <button className="btn primary" disabled={busy || !form.companyName.trim() || !form.employeeName.trim()} onClick={saveSettlement}>
                  {busy ? 'Saving…' : recordId ? 'Save changes' : 'Save settlement'}
                </button>
                <button className="btn ghost" onClick={() => window.print()}>Print / Save as PDF</button>
                <button className="btn ghost" onClick={clearForm}>Clear all</button>
              </div>
              <p className="fnf-hint">To save a PDF, choose “Save as PDF” in the print dialog.</p>
            </aside>

            <main className="fnf-preview" aria-label="Settlement preview">
              <SettlementPaper data={form} totals={totals} />
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
