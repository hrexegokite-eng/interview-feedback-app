'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, api } from '@/components/ui';
import { EMPLOYEE_FIELDS, EXPERIENCE_AREAS, FEEDBACK_FIELDS } from './fields';

function displayDate(value) {
  if (!value) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Date(dateOnly ? `${value}T00:00:00` : value).toLocaleDateString();
}

function Review({ responses }) {
  return (
    <div style={{ padding: '4px 0 16px' }}>
      <h3 className="exit-subheading">Employee information</h3>
      <div className="exit-review-grid">
        {EMPLOYEE_FIELDS.map(({ key, label }) => (
          <div key={key} className="exit-review-item">
            <span className="mut">{label}</span>
            <strong>{key.includes('Day') || key === 'dateOfJoining' ? displayDate(responses[key]) : responses[key] || '—'}</strong>
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
            <strong>{responses.experience?.[key] || '—'}</strong>
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

  return (
    <div className="page-shell">
      <div className="shell-panel" style={{ padding: 18 }}>
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
                return (
                  <details key={form.token} className="exit-record">
                    <summary>
                      <span>
                        <strong>{employeeName || 'Employee form'}</strong>
                        <span className={'exit-status' + (submitted ? ' submitted' : '')}>
                          {submitted ? 'Submitted' : 'Awaiting response'}
                        </span>
                      </span>
                      <span className="mut">{displayDate(form.submitted_at || form.created_at)}</span>
                    </summary>
                    {submitted ? (
                      <Review responses={form.responses} />
                    ) : (
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
                    )}
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
