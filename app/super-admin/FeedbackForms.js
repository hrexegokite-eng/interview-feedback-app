'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, fmt } from '@/components/ui';

const TYPES = [
  ['short_text', 'Short text'],
  ['long_text', 'Long text / comments'],
  ['number', 'Number'],
  ['rating', 'Rating scale (1–5)'],
  ['dropdown', 'Dropdown'],
  ['yes_no', 'Yes / No'],
];

function questionId() {
  return `question_${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
}

function blankForm() {
  return {
    id: '',
    name: '',
    questions: [{ id: questionId(), label: '', type: 'short_text', required: true }],
  };
}

function blankB2CForm() {
  const question = (label, type = 'short_text', options, section = '') => ({
    id: questionId(),
    label,
    type,
    required: true,
    ...(section ? { section } : {}),
    ...(options ? { options, optionsText: options.join('\n') } : {}),
  });

  return {
    id: '',
    name: 'B2C',
    questions: [
      question('Proposed Designation', 'short_text', null, 'Candidate Details'),
      question('English', 'rating', null, 'Language Skill Ratings'),
      question('Hindi', 'rating', null, 'Language Skill Ratings'),
      question('Tamil', 'rating', null, 'Language Skill Ratings'),
      question('Malayalam', 'rating', null, 'Language Skill Ratings'),
      question('Bangla', 'rating', null, 'Language Skill Ratings'),
      question('Marathi', 'rating', null, 'Language Skill Ratings'),
      question('Communication Fluency', 'rating', null, 'Communication Fluency'),
      question('Global Visa', 'rating', null, 'Product Knowledge Inputs'),
      question('Holidays', 'rating', null, 'Product Knowledge Inputs'),
      question('GCC Visa', 'rating', null, 'Product Knowledge Inputs'),
      question('Ticketing', 'rating', null, 'Product Knowledge Inputs'),
      question('Auxiliary', 'rating', null, 'Product Knowledge Inputs'),
      question('Other Products (enter None if not applicable)', 'short_text', null, 'Product Knowledge Inputs'),
      question('Prior B2C Experience', 'dropdown', ['None', 'Yes', 'No'], 'Experience and Selection'),
      question('Years of prior Experience', 'number', null, 'Experience and Selection'),
      question('Job Neediness', 'dropdown', ['None', 'High', 'Medium', 'Low'], 'Experience and Selection'),
      question('Attitude and Personality', 'long_text', null, 'Attitude and Personality'),
    ],
  };
}

export default function FeedbackForms() {
  const [forms, setForms] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setForms(await api('/api/super-admin/forms'));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load feedback forms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateQuestion(id, changes) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question) => question.id === id ? { ...question, ...changes } : question),
    }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const editing = Boolean(form.id);
      await api('/api/super-admin/forms', {
        method: editing ? 'PATCH' : 'POST',
        body: {
          ...(editing ? { id: form.id } : {}),
          name: form.name,
          questions: form.questions.map((question) => ({
            ...question,
            ...(question.type === 'dropdown'
              ? { options: (question.optionsText || '').split('\n').map((option) => option.trim()).filter(Boolean) }
              : {}),
          })),
        },
      });
      setForm(null);
      setMessage(editing ? 'Form updated. Existing interview links keep their assigned version.' : 'Feedback form created.');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save feedback form.');
    } finally {
      setBusy(false);
    }
  }

  async function setActive(item, active) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/api/super-admin/forms', { method: 'PATCH', body: { id: item.id, active } });
      setMessage(active ? `${item.name} is active for new candidates.` : `${item.name} was archived; existing links are unchanged.`);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'Unable to update feedback form.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Permanently delete the "${item.name}" form? Existing interview links will remain unchanged.`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/api/super-admin/forms', { method: 'DELETE', body: { id: item.id } });
      setMessage(`${item.name} was deleted.`);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete feedback form.');
    } finally {
      setBusy(false);
    }
  }

  function edit(item) {
    setError('');
    setMessage('');
    setForm({
      id: item.id,
      name: item.name,
      questions: item.questions.map((question) => ({
        ...question,
        optionsText: question.options?.join('\n') || '',
      })),
    });
  }

  if (loading) return <div className="card"><p className="sm mut">Loading feedback forms…</p></div>;

  return (
    <div>
      {error && <p className="err" role="alert">{error}</p>}
      {message && <p className="sm" role="status" style={{ color: 'var(--ok)', marginBottom: 14 }}>{message}</p>}

      <section className="card feedback-form-list">
        <div className="feedback-form-list-head">
          <div>
            <h2 style={{ marginBottom: 4 }}>SBU feedback forms</h2>
            <p className="sm mut">Create named forms for the SBU dropdown. Editing a form affects new interview links only.</p>
          </div>
          <div className="feedback-form-list-actions">
            <button className="btn ghost" disabled={busy} onClick={() => { setError(''); setMessage(''); setForm(blankB2CForm()); }}>
              Create B2C form
            </button>
            <button className="btn primary" disabled={busy} onClick={() => { setError(''); setMessage(''); setForm(blankForm()); }}>
              Create form
            </button>
          </div>
        </div>

        {forms.length ? forms.map((item) => (
          <div key={item.id} className="row">
            <div className="grow">
              <b>{item.name}</b>
              <div className="sm mut">
                {item.questions.length} question{item.questions.length === 1 ? '' : 's'} · Version {item.version} · {item.active ? 'Active' : 'Archived'} · Updated {fmt(item.updated_at)}
              </div>
            </div>
            <button className="btn ghost" disabled={busy} onClick={() => edit(item)}>Edit</button>
            <button className="btn ghost" disabled={busy} onClick={() => setActive(item, !item.active)}>
              {item.active ? 'Archive' : 'Restore'}
            </button>
            <button className="btn ghost danger" disabled={busy} onClick={() => remove(item)}>Delete</button>
          </div>
        )) : <p className="sm mut" style={{ marginTop: 16 }}>No feedback forms yet. Create one to add named options to the SBU dropdown.</p>}
      </section>

      {form && (
        <form className="card feedback-form-editor" onSubmit={save} style={{ marginTop: 16 }}>
          <h2>{form.id ? 'Edit feedback form' : 'Create feedback form'}</h2>
          <p className="sm mut">Choose an answer type and optional segment for each question. Long text / comments adds a comment field.</p>
          <div className="f">
            <label htmlFor="feedback-form-name">Form name / SBU</label>
            <input id="feedback-form-name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>

          {form.questions.map((question, index) => (
            <fieldset key={question.id} className="card feedback-form-question">
              <legend className="sm mut">Question {index + 1}</legend>
              <div className="f">
                <label htmlFor={`question-label-${question.id}`}>Question</label>
                <input
                  id={`question-label-${question.id}`}
                  required
                  maxLength={160}
                  value={question.label}
                  onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                />
              </div>
              <div className="f">
                <label htmlFor={`question-section-${question.id}`}>Segment (optional)</label>
                <input
                  id={`question-section-${question.id}`}
                  maxLength={80}
                  placeholder="e.g. Candidate details"
                  value={question.section || ''}
                  onChange={(event) => updateQuestion(question.id, { section: event.target.value })}
                />
              </div>
              <div className="f">
                <label htmlFor={`question-type-${question.id}`}>Answer type</label>
                <select
                  id={`question-type-${question.id}`}
                  value={question.type}
                  onChange={(event) => updateQuestion(question.id, { type: event.target.value })}
                >
                  {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              {question.type === 'dropdown' && (
                <div className="f">
                  <label htmlFor={`question-options-${question.id}`}>Options (one per line)</label>
                  <textarea
                    id={`question-options-${question.id}`}
                    required
                    rows={4}
                    value={question.optionsText || ''}
                    onChange={(event) => updateQuestion(question.id, { optionsText: event.target.value })}
                  />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <label className="sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                  />
                  Required
                </label>
                <button
                  type="button"
                  className="btn ghost danger"
                  disabled={form.questions.length === 1}
                  onClick={() => setForm({ ...form, questions: form.questions.filter((item) => item.id !== question.id) })}
                >
                  Remove question
                </button>
              </div>
            </fieldset>
          ))}

          <div className="feedback-form-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn ghost"
              disabled={form.questions.length >= 40}
              onClick={() => setForm({ ...form, questions: [...form.questions, { id: questionId(), label: '', type: 'short_text', required: true }] })}
            >
              Add question
            </button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save form'}</button>
            <button type="button" className="btn ghost" disabled={busy} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
