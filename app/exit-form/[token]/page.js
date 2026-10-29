'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Logo, api } from '@/components/ui';
import { EMPLOYEE_FIELDS, EXPERIENCE_AREAS } from '../fields';

const INITIAL_FORM = {
  employeeName: '',
  employeeId: '',
  department: '',
  designation: '',
  dateOfJoining: '',
  lastWorkingDay: '',
  reportingManager: '',
  primaryReason: '',
  acceptedAnotherJob: '',
  newOpportunityAttraction: '',
  retentionSuggestions: '',
  experience: {},
  likedMost: '',
  challenges: '',
  improvements: '',
  wouldRejoin: '',
  knowledgeHandover: '',
  assetsReturned: '',
  pendingTasks: '',
};

function Field({ label, name, value, onChange, type = 'text', required = false, wide = false }) {
  return (
    <div className={wide ? 'exit-field wide' : 'exit-field'}>
      <label htmlFor={name}>{label}{required && <span className="req"> *</span>}</label>
      <input id={name} name={name} type={type} value={value} onChange={onChange} required={required} maxLength={name === 'employeeId' ? 80 : 150} />
    </div>
  );
}

function TextAnswer({ label, name, value, onChange, required = false }) {
  return (
    <div className="exit-field">
      <label htmlFor={name}>{label}{required && <span className="req"> *</span>}</label>
      <textarea id={name} name={name} value={value} onChange={onChange} required={required} rows={3} maxLength={2000} />
    </div>
  );
}

function Choice({ label, name, value, options, onChange, required = true }) {
  return (
    <fieldset className="exit-choice">
      <legend>{label}{required && <span className="req"> *</span>}</legend>
      <div className="exit-options">
        {options.map((option) => (
          <label key={option} className="exit-option">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={onChange}
              required={required}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function EmployeeExitForm() {
  const { token } = useParams();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api(`/api/exit-forms/${token}`)
      .then((result) => setSubmitted(result.submitted))
      .catch((e) => setUnavailable(e.status === 404 ? 'This form link is invalid or no longer available.' : e.message))
      .finally(() => setLoading(false));
  }, [token]);

  function change(e) {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function changeExperience(area, rating) {
    setForm((current) => ({ ...current, experience: { ...current.experience, [area]: rating } }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(`/api/exit-forms/${token}`, { method: 'POST', body: form });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Could not submit the form. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="shell-panel exit-public-panel">
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={44} />
            <span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
              Employee Exit Form
            </span>
          </div>
        </div>

        <main className="exit-public-content">
          {loading ? (
            <div className="center"><p className="mut">Loading form…</p></div>
          ) : unavailable ? (
            <div className="center" role="alert">
              <h1>Form unavailable</h1>
              <p className="mut">{unavailable}</p>
            </div>
          ) : submitted ? (
            <div className="center exit-success" role="status">
              <h1>Thank you for your feedback</h1>
              <p className="mut">Your exit form has been submitted successfully.</p>
            </div>
          ) : (
            <>
              <div className="exit-intro">
                <span className="exit-kicker">Confidential · For Human Resources use</span>
                <h1>Employee Exit Form</h1>
                <p className="mut">Please complete this form as part of your offboarding process. Fields marked with * are required.</p>
              </div>

              <form onSubmit={submit}>
                <section className="exit-section">
                  <h2>1. Employee information</h2>
                  <div className="exit-grid">
                    {EMPLOYEE_FIELDS.map(({ key, label }) => (
                      <Field
                        key={key}
                        name={key}
                        label={label}
                        type={key === 'dateOfJoining' || key === 'lastWorkingDay' ? 'date' : 'text'}
                        value={form[key]}
                        onChange={change}
                        required
                        wide={key === 'reportingManager'}
                      />
                    ))}
                  </div>
                </section>

                <section className="exit-section">
                  <h2>2. Reason for resignation</h2>
                  <div className="exit-stack">
                    <TextAnswer label="What is the primary reason for leaving the organization?" name="primaryReason" value={form.primaryReason} onChange={change} required />
                    <Choice label="Have you accepted another job offer?" name="acceptedAnotherJob" value={form.acceptedAnotherJob} options={['Yes', 'No']} onChange={change} />
                    {form.acceptedAnotherJob === 'Yes' && (
                      <TextAnswer label="What is the main attraction of the new opportunity?" name="newOpportunityAttraction" value={form.newOpportunityAttraction} onChange={change} required />
                    )}
                    <TextAnswer label="Could anything have been done to retain you?" name="retentionSuggestions" value={form.retentionSuggestions} onChange={change} required />
                  </div>
                </section>

                <section className="exit-section">
                  <h2>3. Employee experience</h2>
                  <p className="mut">Select one rating for each item.</p>
                  <div className="exit-rating-wrap">
                    <table className="exit-rating-table">
                      <thead>
                        <tr>
                          <th scope="col">Criteria</th>
                          {['Excellent', 'Good', 'Average', 'Poor'].map((rating) => <th key={rating} scope="col">{rating}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {EXPERIENCE_AREAS.map(({ key, label }) => (
                          <tr key={key}>
                            <th scope="row">{label}</th>
                            {['Excellent', 'Good', 'Average', 'Poor'].map((rating) => (
                              <td key={rating}>
                                <input
                                  type="radio"
                                  name={`experience-${key}`}
                                  aria-label={`${label}: ${rating}`}
                                  checked={form.experience[key] === rating}
                                  onChange={() => changeExperience(key, rating)}
                                  required
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="exit-section">
                  <h2>4. Feedback and suggestions</h2>
                  <div className="exit-stack">
                    <TextAnswer label="What did you like most about working here?" name="likedMost" value={form.likedMost} onChange={change} required />
                    <TextAnswer label="What challenges did you face during your employment?" name="challenges" value={form.challenges} onChange={change} required />
                    <TextAnswer label="What improvements would you suggest to the organization?" name="improvements" value={form.improvements} onChange={change} required />
                    <Choice label="Would you consider rejoining the organization in the future?" name="wouldRejoin" value={form.wouldRejoin} options={['Yes', 'No', 'Maybe']} onChange={change} />
                  </div>
                </section>

                <section className="exit-section">
                  <h2>5. Exit formalities</h2>
                  <div className="exit-stack">
                    <Choice label="Knowledge handover completed" name="knowledgeHandover" value={form.knowledgeHandover} options={['Yes', 'No']} onChange={change} />
                    <Choice label="Company assets returned" name="assetsReturned" value={form.assetsReturned} options={['Yes', 'No', 'Not Applicable']} onChange={change} />
                    <TextAnswer label="Pending tasks / clearance" name="pendingTasks" value={form.pendingTasks} onChange={change} required={false} />
                  </div>
                </section>

                {error && <p role="alert" className="exit-message error">{error}</p>}
                <p className="exit-confidential">Your responses will be shared with Human Resources for offboarding purposes.</p>
                <button className="btn primary exit-submit" type="submit" disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit exit form'}
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
