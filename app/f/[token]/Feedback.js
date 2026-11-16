'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Icon, Av, Logo, LoadingState, api, fmt, LBL, ICO, COL, DESC } from '@/components/ui';
import { emptyEvaluation, JOB_NEEDINESS, LANGUAGES, PRODUCTS, RATINGS, validateCustomEvaluation, validateEvaluation } from '@/lib/interview-feedback';

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 523.25, start: 0, dur: 0.15 },    // C5
      { freq: 659.25, start: 0.12, dur: 0.15 },  // E5
      { freq: 783.99, start: 0.24, dur: 0.25 },  // G5
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch (_) {}
}

export default function Feedback({ token }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [evaluation, setEvaluation] = useState(emptyEvaluation());
  const [answers, setAnswers] = useState({});
  const formRef = useRef(null);

  useEffect(() => {
    api('/api/feedback/' + token)
      .then((x) => {
        setD(x);
        setPick(x.decision || '');
        setNote(x.note || '');
        setEvaluation({ ...emptyEvaluation(x.role || ''), ...(x.evaluation || {}) });
        setAnswers(x.evaluation || {});
      })
      .catch((e) => setErr(e.message));
  }, [token]);

  useEffect(() => {
    const kd = (e) => {
      if (done || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.metaKey || e.ctrlKey) return;
      const k = ['proceed', 'reject'][+e.key - 1];
      if (k) setPick(k);
    };
    addEventListener('keydown', kd);
    return () => removeEventListener('keydown', kd);
  }, [done]);

  async function submit() {
    if (!pick) return;
    const invalidField = formRef.current?.querySelector(':invalid');
    if (invalidField) {
      invalidField.reportValidity();
      setMsg('Complete all required fields before submitting.');
      return;
    }
    const formAnswers = d.form_snapshot
      ? validateCustomEvaluation(answers, d.form_snapshot.questions)
      : validateEvaluation(evaluation);
    if (!formAnswers) {
      setMsg('Complete all required assessment fields with valid values.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await api('/api/feedback/' + token, { method: 'POST', body: { decision: pick, note, evaluation: formAnswers } });
      playSuccessSound();
      setDone(true);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  function setField(key, value) {
    setEvaluation((current) => ({ ...current, [key]: value }));
  }

  function setRating(group, key, value) {
    setEvaluation((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  }

  function renderCustomQuestion(question) {
    const value = answers[question.id] || '';
    const required = question.required;
    const label = (
      <label htmlFor={`question-${question.id}`}>
        {question.label} {required && <span className="req">*</span>}
      </label>
    );
    const update = (event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }));
    const props = { id: `question-${question.id}`, required, value, onChange: update };

    return (
      <div className="evaluation-field" key={question.id}>
        {label}
        {question.type === 'long_text' ? (
          <textarea {...props} rows={3} maxLength={2000} />
        ) : question.type === 'rating' ? (
          <select {...props}>
            <option value="">Select rating</option>
            {RATINGS.map(([rating, description]) => <option key={rating} value={rating}>{description}</option>)}
          </select>
        ) : question.type === 'dropdown' ? (
          <select {...props}>
            <option value="">Select an option</option>
            {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : question.type === 'yes_no' ? (
          <select {...props}>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        ) : (
          <input {...props} type="text" maxLength={2000} />
        )}
      </div>
    );
  }

  function ratingField(id, label, value, onChange) {
    return (
      <div className="evaluation-field" key={id}>
        <label htmlFor={id}>{label} <span className="req">*</span></label>
        <select id={id} required value={value || ''} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select rating</option>
          <option value="none">None</option>
          {RATINGS.map(([rating, description]) => <option key={rating} value={rating}>{description}</option>)}
        </select>
      </div>
    );
  }

  const head = (
    <div className="brand" style={{ justifyContent: 'space-between', marginBottom: 28, alignItems: 'center' }}>
      <Logo h={44} />
      <span className="sm mut" style={{ fontWeight: 500 }}>Interview feedback</span>
    </div>
  );

  if (err) return <div className="narrow"><div className="center"><Logo h={64} style={{ margin: '0 auto 22px' }} /><h1>Link not found</h1><p className="mut" style={{ marginTop: 8 }}>This feedback link is invalid or has been removed.</p></div></div>;
  if (!d) return <LoadingState label="Loading interview feedback form" />;

  const round = 'Round ' + d.round_no + (d.round_name && d.round_name !== 'Round ' + d.round_no ? ' · ' + d.round_name : '');
  const requiredValues = d.form_snapshot ? [
    ...d.form_snapshot.questions.filter((question) => question.required).map((question) => answers[question.id]?.trim()),
    pick,
  ] : [
    evaluation.proposedDesignation?.trim(),
    ...LANGUAGES.map((language) => evaluation.languageRatings?.[language]),
    evaluation.communicationFluency,
    ...PRODUCTS.map((product) => evaluation.productKnowledge?.[product]),
    evaluation.otherProducts?.trim(),
    evaluation.priorB2BExperience,
    Number.isFinite(Number(evaluation.yearsPriorExperience)) && evaluation.yearsPriorExperience !== '' && Number(evaluation.yearsPriorExperience) >= 0 && Number(evaluation.yearsPriorExperience) <= 60,
    evaluation.jobNeediness,
    evaluation.attitudePersonality?.trim(),
    pick,
  ];
  const completedFields = requiredValues.filter(Boolean).length;
  const completionPercent = Math.round((completedFields / requiredValues.length) * 100);

  const isSubmitted = done || Boolean(d.decision);

  if (isSubmitted) {
    const decisionKey = pick || d.decision || 'proceed';
    return (
      <div className="narrow feedback-success-shell">
        <div className="feedback-success-card">
          <div
            className="feedback-success-icon"
          >
            <Icon n="check" s={42} />
          </div>

          <h1 className="feedback-success-title">
            Feedback Successfully Submitted
          </h1>

          <p className="feedback-success-message">
            Thank you for taking the time to provide your evaluation! Your feedback for <b style={{ color: 'var(--ink)' }}>{d.candidate}</b> ({round}) has been securely recorded and shared with the recruitment team.
          </p>

          <div className="feedback-success-recommendation">
            <span className="feedback-success-dot" />
            <span>Recorded recommendation: <b style={{ color: '#94f5c6' }}>{LBL[decisionKey] || 'Submitted'}</b></span>
          </div>

          <div className="feedback-success-footer">
            <p className="sm mut">
              We appreciate your valuable contribution to the hiring process. You may safely close this window.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={formRef} className="narrow feedback-page" style={{ maxWidth: 820, margin: '0 auto', paddingTop: 8 }}>
      <div className="feedback-page-head">
        {head}
        <div className="feedback-intro">
          <div className="feedback-eyebrow"><span /> INTERVIEWER WORKSPACE</div>
          <h1>Interview feedback</h1>
          <p>Share a thoughtful assessment to help the team make a confident decision.</p>
        </div>
      </div>

      {/* Candidate Profile Summary */}
      <div className="card feedback-candidate-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Av name={d.candidate} small />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="feedback-candidate-name">{d.candidate}</span>
              <span className="feedback-round-pill">{round}</span>
            </div>
            <div className="feedback-candidate-meta">
              {[d.role || 'Candidate', d.interviewer ? 'by ' + d.interviewer : '', d.scheduled_at ? fmt(d.scheduled_at) : ''].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* Action Links (Meet & CV) */}
        {(d.meet_link || d.cv_url) && (
          <div className="feedback-resources">
            {d.meet_link && (
              <a href={d.meet_link} target="_blank" rel="noreferrer" className="feedback-resource-link">
                <Icon n="video" s={13} /> Join Meet ↗
              </a>
            )}
            {d.cv_url && (
              <a href={d.cv_url} target="_blank" rel="noreferrer" className="feedback-resource-link">
                <Icon n="file" s={13} /> {d.cv_filename || 'View CV'} ↗
              </a>
            )}
          </div>
        )}
      </div>

      <div className="feedback-progress-card" aria-label={`${completedFields} of ${requiredValues.length} required fields complete`}>
        <div className="feedback-progress-copy">
          <span className="feedback-progress-title">Assessment progress</span>
          <span className="feedback-progress-count">{completedFields} <span>/ {requiredValues.length} complete</span></span>
        </div>
        <div className="feedback-progress-track" role="progressbar" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Required fields completed">
          <span style={{ width: `${completionPercent}%` }} />
        </div>
        <nav className="feedback-section-nav" aria-label="Feedback form sections">
          <a href="#feedback-assessment">Assessment</a>
          <a href="#feedback-recommendation">Recommendation</a>
        </nav>
      </div>

      <div className="card evaluation-card" id="feedback-assessment">
        <div className="evaluation-heading">
          <div>
            <h2>{d.form_snapshot?.name || 'Interview evaluation'}</h2>
            <p className="sm mut">Complete the candidate assessment, then choose a recommendation below.</p>
          </div>
          <span className="evaluation-step">Candidate assessment</span>
        </div>

        {d.form_snapshot ? (
          <div className="evaluation-section">
            <div className="evaluation-grid">
              {d.form_snapshot.questions.map(renderCustomQuestion)}
            </div>
          </div>
        ) : <>
        <div className="evaluation-section">
          <div className="evaluation-field">
            <label htmlFor="proposed-designation">Proposed Designation <span className="req">*</span></label>
            <input id="proposed-designation" type="text" required maxLength={200} value={evaluation.proposedDesignation} onChange={(event) => setField('proposedDesignation', event.target.value)} />
          </div>
        </div>

        <div className="evaluation-section">
          <h3>Language Skill Ratings</h3>
          <div className="evaluation-grid languages">
            {LANGUAGES.map((language) => ratingField(
              'language-' + language.toLowerCase(), language, evaluation.languageRatings?.[language] || '',
              (value) => setRating('languageRatings', language, value)
            ))}
          </div>
        </div>

        <div className="evaluation-section">
          <h3>Communication Fluency</h3>
          <div className="evaluation-grid">
            {ratingField('communication-fluency', 'Fluency rating', evaluation.communicationFluency, (value) => setField('communicationFluency', value))}
          </div>
        </div>

        <div className="evaluation-section">
          <h3>Product Knowledge Inputs</h3>
          <div className="evaluation-grid products">
            {PRODUCTS.map((product) => ratingField(
              'product-' + product.toLowerCase().replaceAll(' ', '-'), product, evaluation.productKnowledge?.[product] || '',
              (value) => setRating('productKnowledge', product, value)
            ))}
            <div className="evaluation-field">
              <label htmlFor="other-products">Other Products (enter None if not applicable) <span className="req">*</span></label>
              <input id="other-products" type="text" required maxLength={200} value={evaluation.otherProducts} onChange={(event) => setField('otherProducts', event.target.value)} />
            </div>
          </div>
        </div>

        <div className="evaluation-section">
          <h3>Experience and Selection</h3>
          <div className="evaluation-grid">
            <div className="evaluation-field">
              <label htmlFor="prior-b2b-experience">Prior B2B Experience <span className="req">*</span></label>
              <select id="prior-b2b-experience" required value={evaluation.priorB2BExperience} onChange={(event) => setField('priorB2BExperience', event.target.value)}>
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="evaluation-field">
              <label htmlFor="years-prior-experience">Years of prior Experience <span className="req">*</span></label>
              <input id="years-prior-experience" type="number" required min="0" max="60" step="0.1" value={evaluation.yearsPriorExperience} onChange={(event) => setField('yearsPriorExperience', event.target.value)} />
            </div>
            <div className="evaluation-field">
              <label htmlFor="job-neediness">Job Neediness <span className="req">*</span></label>
              <select id="job-neediness" required value={evaluation.jobNeediness} onChange={(event) => setField('jobNeediness', event.target.value)}>
                <option value="">Select</option>
                <option value="none">None</option>
                {JOB_NEEDINESS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="evaluation-section">
          <h3>Attitude and Personality</h3>
          <div className="evaluation-field">
            <label htmlFor="attitude-personality">Assessment <span className="req">*</span></label>
            <textarea id="attitude-personality" required maxLength={1500} rows={3} value={evaluation.attitudePersonality} onChange={(event) => setField('attitudePersonality', event.target.value)} />
          </div>
        </div>
        </>}
      </div>

      {/* Decision Card */}
      <div
        id="feedback-recommendation"
        className="card"
        data-feedback-decision
        style={{
          marginTop: 14,
          padding: '22px 20px 18px',
          borderRadius: 18,
          border: '1px solid rgba(110, 231, 215, 0.18)',
          background: 'linear-gradient(180deg, rgba(20, 27, 34, 0.98), rgba(15, 21, 27, 0.98))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 30px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.01em', textTransform: 'uppercase' }}>
            Recommendation <span className="req">*</span>
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--mut)' }}>
            Keys 1 · 2
          </span>
        </div>

        <div className="opts">
          {['proceed', 'reject'].map((k, i) => (
            <button
              key={k}
              type="button"
              className={'opt ' + k}
              aria-pressed={pick === k}
              onClick={() => setPick(k)}
              style={{
                borderRadius: 14,
                padding: '14px 14px',
                minHeight: 74,
              }}
            >
              <span className="ico-dot" />
              <span className="content">
                <b>{LBL[k]}</b>
                <span className="d">{DESC[k]}</span>
              </span>
              <kbd>{i + 1}</kbd>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label htmlFor="n" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
              Comments <span className="sm mut">(optional)</span>
            </label>
            <span style={{ fontSize: 11, color: 'var(--mut)' }}>{note.length} / 1500</span>
          </div>
          <textarea
            id="n"
            value={note}
            maxLength={1500}
            rows={4}
            placeholder="Strengths, concerns, anything the hiring team should know…"
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit(); }}
            style={{
              width: '100%',
              borderRadius: 14,
              fontSize: 13.5,
              lineHeight: 1.6,
              border: '1px solid rgba(110, 231, 215, 0.14)',
              background: 'linear-gradient(180deg, rgba(14,20,26,0.9), rgba(18,28,35,0.8))',
              color: 'var(--ink)',
              padding: '12px 14px',
              resize: 'vertical',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
            }}
          />
        </div>

        <p className={'sm ' + (msg ? 'err' : 'mut') + ' feedback-submit-hint'} style={{ textAlign: 'center', marginTop: 12, fontSize: 11.5 }}>
          {msg || (pick ? 'Press ⌘/Ctrl + Enter to submit' : 'Choose Proceed or Reject')}
        </p>
      </div>
      <div className="feedback-submit-spacer" aria-hidden="true" />
      <div className="feedback-submit-dock">
        <div className="feedback-dock-progress">
          <span className="feedback-dock-count">{completedFields}/{requiredValues.length}</span>
          <span>{msg || (pick ? `${LBL[pick]} selected` : 'Choose a recommendation')}</span>
        </div>
        <button type="button" className="btn primary feedback-submit-button" disabled={!pick || busy} onClick={submit}>
          {busy ? <><span className="btn-spinner" aria-hidden="true" />Saving…</> : pick ? <>Submit feedback <span>· {LBL[pick]}</span></> : 'Select a recommendation'}
        </button>
      </div>
    </div>
  );
}
