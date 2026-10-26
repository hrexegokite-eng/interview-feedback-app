'use client';
import { useEffect, useState } from 'react';
import { api, Logo } from '@/components/ui';

export default function ExitForm({ token }) {
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api('/api/exit-interviews/' + token)
      .then((data) => { setForm(data); setDone(!!data.submitted_at); })
      .catch((reason) => setError(reason.message));
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/exit-interviews/' + token, { method: 'POST', body: { answers } });
      setDone(true);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow">
      <div className="brand" style={{ justifyContent: 'space-between', marginBottom: 28 }}>
        <Logo h={44} />
        <span className="sm mut">Exit Interview</span>
      </div>
      {error && !form ? <div className="card"><h1>Form unavailable</h1><p className="err" style={{ marginTop: 12 }}>{error}</p></div> : !form ? (
        <div className="card"><p className="mut">Loading your form…</p></div>
      ) : done ? (
        <div className="card center">
          <div style={{ fontSize: 36, color: 'var(--ok)', marginBottom: 12 }}>✓</div>
          <h1>Thank you, {form.employee_name}</h1>
          <p className="mut" style={{ marginTop: 12 }}>Your exit interview response has been submitted. We appreciate your feedback.</p>
        </div>
      ) : (
        <form className="card" onSubmit={submit}>
          <div className="badge scheduled" style={{ marginBottom: 12 }}>Private employee form</div>
          <h1>{form.title}</h1>
          <p className="mut" style={{ marginTop: 8 }}>For {form.employee_name}</p>
          {form.description && <p style={{ marginTop: 18, whiteSpace: 'pre-wrap' }}>{form.description}</p>}
          {form.questions.map((question, index) => (
            <div className="f" key={question.id}>
              <label htmlFor={`answer-${question.id}`}>{index + 1}. {question.label}{question.required && <span className="req"> *</span>}</label>
              <textarea id={`answer-${question.id}`} required={question.required} maxLength={5000} value={answers[question.id] || ''} onChange={(e) => setAnswers((all) => ({ ...all, [question.id]: e.target.value }))} />
            </div>
          ))}
          {error && <p className="err" role="alert" style={{ marginTop: 14 }}>{error}</p>}
          <button className="btn primary full" disabled={busy}>{busy ? 'Submitting…' : 'Submit exit interview'}</button>
        </form>
      )}
    </div>
  );
}
