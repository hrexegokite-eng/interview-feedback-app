'use client';
import { useEffect, useState } from 'react';
import { Icon, Av, Logo, api, fmt, LBL, ICO, COL, DESC } from '@/components/ui';

const CHIPS = {
  proceed: ['Strong communicator', 'Solid technical depth', 'Great culture fit', 'Ready for next round'],
  hold: ['Needs another interview', 'Unclear on depth', 'Compare with other candidates'],
  reject: ['Skill gaps', 'Communication concerns', 'Not aligned with role', 'Low motivation'],
};
const PH = {
  '': 'Strengths, concerns, anything the hiring team should know…',
  proceed: 'What stood out? What should the next round probe?',
  hold: 'What’s unresolved? What would help you decide?',
  reject: 'What were the main gaps? Specifics help the team.',
};

function FeedbackSkeleton() {
  return (
    <div className="narrow">
      <div className="brand" style={{ justifyContent: 'space-between', marginBottom: 28, alignItems: 'center' }}>
        <div className="skeleton" style={{ width: 120, height: 44, borderRadius: 10 }} />
        <div className="skeleton sk-line" style={{ width: 100, height: 12 }} />
      </div>
      <div className="sk-card" style={{ marginTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
          <div className="skeleton sk-circle" style={{ width: 44, height: 44 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton sk-line" style={{ width: '40%', height: 16, marginBottom: 8 }} />
            <div className="skeleton sk-line" style={{ width: '25%', height: 12 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton sk-line" style={{ width: 90, height: 24, borderRadius: 99 }} />
          <div className="skeleton sk-line" style={{ width: 130, height: 24, borderRadius: 99 }} />
        </div>
      </div>
      <div className="sk-card">
        <div className="skeleton sk-line" style={{ width: '45%', height: 18, marginBottom: 18 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 58, borderRadius: 12 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 110, borderRadius: 10, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 46, borderRadius: 12 }} />
      </div>
    </div>
  );
}

export default function Feedback({ token }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/feedback/' + token)
      .then((x) => { setD(x); setPick(x.decision || ''); setNote(x.note || ''); })
      .catch((e) => setErr(e.message));
  }, [token]);

  useEffect(() => {
    const kd = (e) => {
      if (done || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      const k = ['proceed', 'hold', 'reject'][+e.key - 1];
      if (k) setPick(k);
    };
    addEventListener('keydown', kd);
    return () => removeEventListener('keydown', kd);
  }, [done]);

  async function submit() {
    if (!pick) return;
    setBusy(true);
    setMsg('');
    try {
      await api('/api/feedback/' + token, { method: 'POST', body: { decision: pick, note } });
      setDone(true);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  const head = (
    <div className="brand" style={{ justifyContent: 'space-between', marginBottom: 28, alignItems: 'center' }}>
      <Logo h={44} />
      <span className="sm mut" style={{ fontWeight: 500 }}>Interview feedback</span>
    </div>
  );

  if (err) return <div className="narrow"><div className="center"><Logo h={64} style={{ margin: '0 auto 22px' }} /><h1>Link not found</h1><p className="mut" style={{ marginTop: 8 }}>This feedback link is invalid or has been removed.</p></div></div>;
  if (!d) return <FeedbackSkeleton />;

  const round = 'Round ' + d.round_no + (d.round_name && d.round_name !== 'Round ' + d.round_no ? ' · ' + d.round_name : '');

  if (done) {
    const [a, b] = COL[pick];
    return (
      <div className="narrow">
        {head}
        <div className="card done" style={{ '--c': `var(--${a})`, '--c-b': `var(--${b})`, marginTop: 16 }}>
          <div className="tick"><Icon n={ICO[pick]} s={30} /></div>
          <h1 style={{ fontSize: 22 }}>Feedback recorded</h1>
          <p className="mut" style={{ margin: '8px 0 16px' }}>Thanks — your recommendation for {d.candidate} ({round}) is saved.</p>
          <span className={'badge ' + pick}>{LBL[pick]}</span>
          <div style={{ marginTop: 24 }}><button className="btn ghost" onClick={() => setDone(false)}>Edit feedback</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="narrow" style={{ maxWidth: 640, margin: '0 auto' }}>
      {head}

      {/* Candidate Profile Card */}
      <div
        className="card"
        style={{
          marginTop: 16,
          padding: 24,
          background: 'linear-gradient(145deg, var(--card), color-mix(in srgb, var(--accb) 22%, var(--card)))',
          border: '1.5px solid var(--line)',
          borderRadius: 20,
          boxShadow: 'var(--sh-md)',
        }}
      >
        <div className="who" style={{ alignItems: 'center', gap: 16 }}>
          <Av name={d.candidate} style={{ width: 52, height: 52, fontSize: 18 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                {d.candidate}
              </h1>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  background: 'var(--accb)',
                  color: 'var(--acc)',
                  border: '1px solid color-mix(in srgb, var(--acc) 30%, transparent)',
                }}
              >
                {round}
              </span>
            </div>
            <p className="mut sm" style={{ marginTop: 4, fontSize: 14 }}>
              {d.role || 'Candidate'}
            </p>
          </div>
        </div>

        <div className="chips" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {d.scheduled_at && (
            <span className="chip" style={{ fontSize: 12.5, fontWeight: 500 }}>
              <Icon n="cal" s={14} style={{ color: 'var(--acc)' }} />
              <b>Interview:</b> {fmt(d.scheduled_at)}
            </span>
          )}
          {d.interviewer && (
            <span className="chip" style={{ fontSize: 12.5, fontWeight: 500 }}>
              <Icon n="user" s={14} style={{ color: 'var(--acc)' }} />
              <b>Interviewer:</b> {d.interviewer}
            </span>
          )}
        </div>

        {/* Resources for the interviewer */}
        {(d.meet_link || d.cv_url) && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px dashed var(--line)',
            }}
          >
            {d.meet_link && (
              <a
                href={d.meet_link}
                target="_blank"
                rel="noreferrer"
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                }}
              >
                <Icon n="video" s={16} /> Join Google Meet
              </a>
            )}
            {d.cv_url && (
              <a
                href={d.cv_url}
                target="_blank"
                rel="noreferrer"
                className="btn ghost"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '9px 16px',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                  border: '1.5px solid color-mix(in srgb, var(--acc) 35%, var(--line))',
                  background: 'var(--card)',
                }}
              >
                <Icon n="file" s={15} style={{ color: 'var(--acc)' }} />
                <span>{d.cv_filename || 'View Attached CV / Resume'}</span>
                <Icon n="download" s={13} style={{ opacity: 0.7 }} />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Decision Form Card */}
      <div className="card" style={{ marginTop: 20, padding: 26, borderRadius: 20, boxShadow: 'var(--sh-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            Your recommendation
          </h2>
          <span style={{ fontSize: 12, color: 'var(--mut)' }}>
            Press keys 1, 2, or 3
          </span>
        </div>

        {/* Options Switcher */}
        <div className="opts">
          {['proceed', 'hold', 'reject'].map((k, i) => (
            <button
              key={k}
              type="button"
              className={'opt ' + k}
              aria-pressed={pick === k}
              onClick={() => setPick(k)}
            >
              <span className="ico">
                <Icon n={ICO[k]} s={20} />
              </span>
              <span className="content">
                <b>{LBL[k]}</b>
                <span className="d">{DESC[k]}</span>
              </span>
              <kbd>{i + 1}</kbd>
              <span className="switch-radio" aria-hidden="true">
                <span className="switch-radio-dot" />
              </span>
            </button>
          ))}
        </div>

        {/* Notes & Chips */}
        <div className="f" style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label htmlFor="n" style={{ fontWeight: 600, fontSize: 14 }}>
              Evaluation notes
            </label>
            <span style={{ fontSize: 12, color: 'var(--mut)' }}>
              {note.length} / 1500
            </span>
          </div>
          <textarea
            id="n"
            value={note}
            maxLength={1500}
            rows={4}
            placeholder={PH[pick]}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(); }}
            style={{
              marginTop: 8,
              borderRadius: 14,
              fontSize: 14,
              lineHeight: 1.6,
              border: '1.5px solid var(--line)',
              background: 'var(--card2)',
              color: 'var(--ink)',
              padding: '14px 16px',
            }}
          />
          <div className="chips" style={{ marginTop: 10, gap: 8 }}>
            {(CHIPS[pick] || []).map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                onClick={() => setNote((n) => n + (n && !n.endsWith('\n') ? '\n' : '') + '• ' + t)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid var(--line)',
                  background: 'var(--soft)',
                  color: 'var(--ink)',
                  fontSize: 12.5,
                  padding: '6px 12px',
                  borderRadius: 99,
                  transition: 'all 0.18s ease',
                }}
              >
                + {t}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="btn full primary"
          disabled={!pick || busy}
          onClick={submit}
          style={{
            marginTop: 22,
            padding: 15,
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 14,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            ...(pick === 'proceed'
              ? { background: 'linear-gradient(135deg, #059669, #10b981)', color: '#ffffff', boxShadow: '0 6px 22px rgba(16, 185, 129, 0.42)' }
              : pick === 'hold'
              ? { background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#ffffff', boxShadow: '0 6px 22px rgba(245, 158, 11, 0.42)' }
              : pick === 'reject'
              ? { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#ffffff', boxShadow: '0 6px 22px rgba(239, 68, 68, 0.42)' }
              : {}),
          }}
        >
          {busy ? (
            <><span className="btn-spinner" aria-hidden="true" />Recording recommendation…</>
          ) : pick ? (
            <>
              <Icon n={ICO[pick]} s={18} />
              Submit recommendation: {LBL[pick]}
            </>
          ) : (
            'Select a recommendation above'
          )}
        </button>

        <p className={'sm ' + (msg ? 'err' : 'mut')} style={{ textAlign: 'center', marginTop: 12 }}>
          {msg || (pick ? 'Cmd/Ctrl + Enter to submit instantly' : 'Choose a recommendation to enable submission.')}
        </p>
      </div>
    </div>
  );
}
