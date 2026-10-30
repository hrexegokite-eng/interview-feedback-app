'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, api } from '@/components/ui';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EMPLOYEE_FIELDS, EXPERIENCE_AREAS, EXPERIENCE_SCALE, FEEDBACK_FIELDS } from './fields';

function displayDate(value) {
  if (!value) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Date(dateOnly ? `${value}T00:00:00` : value).toLocaleDateString();
}

function dateValue(value) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? displayDate(value) : value || '—';
}

function initials(name) {
  return String(name || 'Employee')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function Review({ responses }) {
  return (
    <div style={{ padding: '4px 0 16px' }}>
      <h3 className="exit-subheading">Employee information</h3>
      <div className="exit-review-grid">
        {EMPLOYEE_FIELDS.map(({ key, label }) => (
          <div key={key} className="exit-review-item">
            <span className="mut">{label}</span>
            <strong>{key === 'dateOfJoining' || key === 'lastWorkingDay' ? dateValue(responses[key]) : responses[key] || '—'}</strong>
          </div>
        ))}
      </div>

      <h3 className="exit-subheading">Reason and feedback</h3>
      <div className="exit-review-grid">
        {FEEDBACK_FIELDS.map(({ key, label }) => (
          <div key={key} className="exit-review-item">
            <span className="mut">{label}</span>
            <strong>{responses[key] || '—'}</strong>
          </div>
        ))}
      </div>

      <h3 className="exit-subheading">Employee experience</h3>
      <div className="exit-review-grid">
        {EXPERIENCE_AREAS.map(({ key, label }) => (
          <div key={key} className="exit-review-item">
            <span className="mut">{label}</span>
            <strong>
              {responses.experience?.[key]
                ? `${EXPERIENCE_SCALE[responses.experience[key]]} - ${responses.experience[key]}`
                : '—'}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExitFormDashboard() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openProfile, setOpenProfile] = useState('');
  const [downloading, setDownloading] = useState('');

  const loadForms = useCallback(async () => {
    try {
      setForms(await api('/api/exit-forms'));
      setError('');
    } catch (e) {
      if (e.status === 401) {
        router.replace('/login');
        return;
      }
      setError(e.message || 'Could not load exit forms.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  async function createLink() {
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const { token } = await api('/api/exit-forms', { method: 'POST' });
      setNewLink(`${window.location.origin}/exit-form/${token}`);
      setNotice('A new employee form link is ready to share.');
      await loadForms();
    } catch (e) {
      setError(e.message || 'Could not create an exit form link.');
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(newLink);
      setNotice('Form link copied.');
    } catch {
      setError('Could not copy the link. Select and copy it manually.');
    }
  }

  async function downloadPdf(form) {
    const responses = form.responses;
    if (!responses || downloading) return;
    setDownloading(form.token);
    setError('');
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const clean = (value) => String(value || '—').replace(/[^\x20-\x7E]/g, ' ').trim() || '—';
      const logoResponse = await fetch('/logo.png');
      if (!logoResponse.ok) throw new Error('Could not load the Go Kite logo for the PDF.');
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the Go Kite logo for the PDF.'));
        reader.readAsDataURL(logoBlob);
      });
      const sectionRow = (content) => [{
        content,
        colSpan: 2,
        styles: { fillColor: [30, 55, 75], textColor: 255, fontStyle: 'bold' },
      }];
      const rows = [
        sectionRow('EMPLOYEE INFORMATION'),
        ...EMPLOYEE_FIELDS.map(({ key, label }) => [
          label,
          key === 'dateOfJoining' || key === 'lastWorkingDay' ? dateValue(responses[key]) : responses[key] || '—',
        ]),
        sectionRow('REASON FOR RESIGNATION'),
        ...FEEDBACK_FIELDS
          .filter(({ key }) => ['primaryReason', 'acceptedAnotherJob', 'newOpportunityAttraction', 'retentionSuggestions'].includes(key))
          .map(({ key, label }) => [label, responses[key] || '—']),
        sectionRow('EMPLOYEE EXPERIENCE'),
        ...EXPERIENCE_AREAS.map(({ key, label }) => {
          const rating = responses.experience?.[key];
          return [label, rating ? `${EXPERIENCE_SCALE[rating]} - ${rating}` : '—'];
        }),
        sectionRow('FEEDBACK AND SUGGESTIONS'),
        ...FEEDBACK_FIELDS
          .filter(({ key }) => ['likedMost', 'challenges', 'improvements', 'wouldRejoin'].includes(key))
          .map(({ key, label }) => [label, responses[key] || '—']),
        sectionRow('EXIT FORMALITIES'),
        ...FEEDBACK_FIELDS
          .filter(({ key }) => ['knowledgeHandover', 'assetsReturned', 'pendingTasks'].includes(key))
          .map(({ key, label }) => [label, responses[key] || '—']),
      ].map((row) => row.map((cell) => typeof cell === 'string'
        ? clean(cell)
        : { ...cell, content: clean(cell.content) }));

      doc.setProperties({
        title: `Exit profile - ${clean(responses.employeeName)}`,
        subject: 'Confidential employee exit form',
      });
      doc.addImage(logoDataUrl, 'PNG', 14, 8, 22, 21);
      doc.setFontSize(18);
      doc.text('Employee Exit Profile', 42, 16);
      doc.setFontSize(10);
      doc.text(clean(responses.employeeName), 42, 22);
      doc.setFontSize(8);
      doc.text(`Submitted: ${displayDate(form.submitted_at)}`, 42, 27);
      doc.setFontSize(8);
      doc.text('Experience scale: 4=Excellent | 3=Good | 2=Average | 1=Poor', 14, 33);
      autoTable(doc, {
        startY: 38,
        head: [['Question', 'Response']],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: [42, 62, 85], fontStyle: 'bold' },
        margin: { left: 14, right: 14, bottom: 18 },
        rowPageBreak: 'avoid',
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.text(`Confidential - Page ${page} of ${pageCount}`, 14, 287);
      }

      const filename = clean(responses.employeeName)
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'employee';
      doc.save(`exit-profile-${filename}.pdf`);
    } catch (e) {
      setError(e.message || 'Could not generate the employee profile PDF.');
    } finally {
      setDownloading('');
    }
  }

  return (
    <div className="page-shell">
      <div className="shell-panel workspace-panel">
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={44} />
            <span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
              Exit Form
            </span>
          </div>
          <button className="btn ghost" onClick={() => router.push('/portal')}>
            Back to Workspace
          </button>
        </div>

        <div style={{ padding: '26px 8px 8px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Employee exit forms</h1>
          <p className="mut" style={{ margin: '0 0 20px' }}>
            Create a private link for an employee and review their submitted exit feedback here.
          </p>
          <button className="btn primary" onClick={createLink} disabled={creating}>
            {creating ? 'Creating link…' : 'Create employee form link'}
          </button>

          {error && <p role="alert" className="exit-message error">{error}</p>}
          {notice && <p role="status" className="exit-message">{notice}</p>}
          {newLink && (
            <div className="exit-link">
              <label htmlFor="new-exit-link">Share this link with the employee</label>
              <div className="exit-link-row">
                <input id="new-exit-link" readOnly value={newLink} onFocus={(e) => e.target.select()} />
                <button className="btn ghost" onClick={copyLink}>Copy link</button>
              </div>
            </div>
          )}

          <h2 className="exit-section-title">Forms and submissions</h2>
          {loading ? (
            <p className="mut">Loading forms…</p>
          ) : !forms.length ? (
            <p className="mut">No exit forms yet. Create a link to send the questionnaire to an employee.</p>
          ) : (
            <div className="exit-record-list">
              {forms.map((form) => {
                const submitted = !!form.submitted_at;
                const employeeName = form.responses?.employeeName;
                const employeeId = form.responses?.employeeId;
                const department = form.responses?.department;
                const designation = form.responses?.designation;
                const lastWorkingDay = form.responses?.lastWorkingDay;
                const isOpen = openProfile === form.token;
                return (
                  <article key={form.token} className="exit-record">
                    <div className="exit-profile-header">
                      <div className="exit-profile-identity">
                        <div className="exit-avatar" aria-hidden="true">{initials(employeeName)}</div>
                        <div className="exit-profile-copy">
                          <div className="exit-profile-name">
                            <strong>{employeeName || 'Employee form'}</strong>
                            <span className={'exit-status' + (submitted ? ' submitted' : '')}>
                              {submitted ? 'Submitted' : 'Awaiting response'}
                            </span>
                          </div>
                          <div className="mut exit-profile-meta">
                            {[designation, department, employeeId && `ID: ${employeeId}`].filter(Boolean).join(' · ') || 'Employee details pending'}
                          </div>
                        </div>
                      </div>
                      <div className="exit-profile-actions">
                        {submitted && (
                          <button
                            className="btn ghost"
                            onClick={() => downloadPdf(form)}
                            disabled={!!downloading}
                          >
                            {downloading === form.token ? 'Preparing PDF…' : 'Download PDF'}
                          </button>
                        )}
                        <button
                          className="btn ghost"
                          aria-expanded={isOpen}
                          onClick={() => setOpenProfile(isOpen ? '' : form.token)}
                        >
                          {isOpen ? 'Close profile' : 'View profile'}
                        </button>
                      </div>
                    </div>
                    {submitted ? (
                      isOpen && (
                        <div className="exit-profile-details">
                          <div className="exit-profile-facts">
                            <div><span className="mut">Last working day</span><strong>{dateValue(lastWorkingDay)}</strong></div>
                            <div><span className="mut">Submitted</span><strong>{displayDate(form.submitted_at)}</strong></div>
                          </div>
                          <Review responses={form.responses} />
                        </div>
                      )
                    ) : (
                      isOpen && (
                        <div className="exit-pending">
                          <p className="mut">This link has not been submitted yet.</p>
                          <div className="exit-link-row">
                            <input readOnly value={`${window.location.origin}/exit-form/${form.token}`} onFocus={(e) => e.target.select()} aria-label="Employee form link" />
                            <button
                              className="btn ghost"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(`${window.location.origin}/exit-form/${form.token}`);
                                  setNotice('Form link copied.');
                                  setError('');
                                } catch {
                                  setError('Could not copy the link. Select and copy it manually.');
                                }
                              }}
                            >
                              Copy link
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
