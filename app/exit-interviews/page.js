'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Av, Icon, Logo, api } from '@/components/ui';

const newQuestion = () => ({ id: crypto.randomUUID(), label: '', required: true });
const shareUrl = (token) => `${location.origin}/exit/${token}`;

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ExitInterviews() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [forms, setForms] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('Exit Interview');
  const [description, setDescription] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [questions, setQuestions] = useState([
    { id: 'reason', label: 'What is your primary reason for leaving?', required: true },
    { id: 'improve', label: 'What could we have done to improve your experience?', required: true },
    { id: 'recommend', label: 'Would you recommend this company as a place to work? Why or why not?', required: true },
  ]);

  const load = useCallback(async () => {
    try {
      setForms(await api('/api/exit-interviews'));
      setLoadError('');
    } catch (error) {
      if (error.status === 401) router.replace('/login');
      else setLoadError(error.message);
    }
  }, [router]);

  useEffect(() => {
    api('/api/auth/me').then(setMe).catch(() => router.replace('/login'));
    load();
  }, [load, router]);

  function flash(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  }

  async function createForm(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = await api('/api/exit-interviews', {
        method: 'POST',
        body: { title, description, employeeName, employeeEmail, questions },
      });
      setEmployeeName('');
      setEmployeeEmail('');
      await load();
      flash((await copy(shareUrl(form.token))) ? 'Form created; share link copied' : 'Form created; copy its link below');
    } catch (error) {
      flash(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <div className="page-shell">
      <div className="shell-panel" style={{ padding: 18 }}>
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={48} />
            <span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>Exit Interview</span>
          </div>
          <div className="me">
            <button className="btn ghost" onClick={() => router.push('/portal')}>← All Modules</button>
            <Av name={me?.email} small />
            <span>{me?.email}</span>
            <button className="btn ghost" onClick={logout}>Sign out</button>
          </div>
        </div>

        <div style={{ margin: '8px 2px 22px' }}>
          <h1>Exit interview forms</h1>
          <p className="mut" style={{ marginTop: 8 }}>Build a private form for each departing employee, share the link, and review completed responses.</p>
        </div>

        {loadError ? <p className="err" role="alert">{loadError}</p> : null}
        <div className="split">
          <form className="card" onSubmit={createForm}>
            <h2>Create an employee form</h2>
            <div className="f">
              <label htmlFor="exit-title">Form title</label>
              <input id="exit-title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="exit-description">Introduction (optional)</label>
              <textarea id="exit-description" rows={3} maxLength={1000} style={{ minHeight: 84 }} placeholder="A short note to the employee…" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="employee-name">Employee name <span className="req">*</span></label>
              <input id="employee-name" required maxLength={160} value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="employee-email">Employee email <span className="req">*</span></label>
              <input id="employee-email" type="email" required maxLength={254} value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} />
            </div>
            <div className="f">
              <label>Questions <span className="req">*</span></label>
              {questions.map((question, index) => (
                <div key={question.id} style={{ marginTop: 12, padding: 12, border: '1px solid var(--line)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <textarea aria-label={`Question ${index + 1}`} required maxLength={300} rows={2} style={{ minHeight: 62 }} placeholder={`Question ${index + 1}`} value={question.label} onChange={(e) => setQuestions((all) => all.map((item) => item.id === question.id ? { ...item, label: e.target.value } : item))} />
                    <button type="button" className="btn ghost" aria-label={`Remove question ${index + 1}`} onClick={() => setQuestions((all) => all.filter((item) => item.id !== question.id))}>×</button>
                  </div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 0' }}>
                    <input type="checkbox" checked={question.required} onChange={(e) => setQuestions((all) => all.map((item) => item.id === question.id ? { ...item, required: e.target.checked } : item))} />
                    Required
                  </label>
                </div>
              ))}
              <button type="button" className="btn ghost" style={{ marginTop: 12 }} disabled={questions.length >= 30} onClick={() => setQuestions((all) => [...all, newQuestion()])}>
                <Icon n="plus" s={14} /> Add question
              </button>
            </div>
            <button className="btn primary full" disabled={busy || !questions.length}>{busy ? 'Creating…' : 'Create form & copy share link'}</button>
          </form>

          <div>
            <div className="card">
              <h2>Shared forms &amp; responses</h2>
              {!forms ? <p className="mut" style={{ marginTop: 16 }}>Loading forms…</p> : forms.length === 0 ? (
                <div className="empty"><Icon n="inbox" s={30} /><p><b>No forms created yet</b></p><p className="sm">Create a form to generate an employee share link.</p></div>
              ) : forms.map((form) => (
                <article key={form.id} style={{ padding: '16px 0', borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <b>{form.title}</b>
                      <div className="sm mut">{form.employee_name} · {form.employee_email}</div>
                    </div>
                    <span className={`badge ${form.submitted_at ? 'proceed' : 'scheduled'}`}>{form.submitted_at ? 'Submitted' : 'Awaiting response'}</span>
                  </div>
                  <div className="link">
                    <input aria-label="Employee form link" readOnly value={shareUrl(form.token)} onFocus={(e) => e.target.select()} />
                    <button className="btn ghost" onClick={async () => flash((await copy(shareUrl(form.token))) ? 'Link copied' : 'Copy failed')}>Copy</button>
                  </div>
                  {!form.submitted_at && (
                    <a
                      className="btn ghost"
                      style={{ marginTop: 8, textDecoration: 'none' }}
                      href={`mailto:${encodeURIComponent(form.employee_email)}?subject=${encodeURIComponent(form.title)}&body=${encodeURIComponent(`Hello ${form.employee_name},\n\nPlease complete your exit interview using this private link:\n${shareUrl(form.token)}`)}`}
                    >
                      Email link to employee
                    </a>
                  )}
                  {form.submitted_at && (
                    <div style={{ marginTop: 14 }}>
                      <div className="sm mut">Submitted {new Date(form.submitted_at).toLocaleString()}</div>
                      {form.questions.map((question) => (
                        <div key={question.id} style={{ marginTop: 10 }}>
                          <div className="sm"><b>{question.label}</b></div>
                          <div className="sm mut" style={{ whiteSpace: 'pre-wrap' }}>{form.answers?.[question.id] || 'No response'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className={'toast' + (message ? ' on' : '')} role="status">{message}</div>
      </div>
    </div>
  );
}
