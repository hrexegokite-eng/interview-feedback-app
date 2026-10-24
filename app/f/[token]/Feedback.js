'use client';
import { useEffect, useState, useCallback } from 'react';
import { Icon, Av, Logo, api, fmt, LBL, ICO, COL, DESC } from '@/components/ui';

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
      playSuccessSound();
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

  const isSubmitted = done || Boolean(d.decision);

  if (isSubmitted) {
    const decisionKey = pick || d.decision || 'proceed';
    return (
      <div className="narrow" style={{ maxWidth: 720, margin: '0 auto', paddingTop: 36 }}>
        <div
          style={{
            background: 'rgba(18, 24, 30, 0.95)',
            border: '1px solid rgba(20, 184, 166, 0.34)',
            borderRadius: 18,
            boxShadow: '0 0 0 1px rgba(20, 184, 166, 0.08), 0 12px 30px rgba(0,0,0,0.28)',
            padding: '28px 28px 22px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #3ff2b0 0%, #18b58a 55%, #0d8b67 100%)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 28px',
              boxShadow: '0 0 0 12px rgba(20, 184, 166, 0.12), 0 14px 28px rgba(20, 184, 166, 0.24)',
            }}
          >
            <Icon n="check" s={42} />
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 18px', color: 'var(--ink)', letterSpacing: '-0.04em', lineHeight: 1.2 }}>
            Feedback Successfully Submitted
          </h1>

          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--mut)', margin: '0 auto 22px', maxWidth: 620 }}>
            Thank you for taking the time to provide your evaluation! Your feedback for <b style={{ color: 'var(--ink)' }}>{d.candidate}</b> ({round}) has been securely recorded and shared with the recruitment team.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(20, 184, 166, 0.12)',
              color: '#5ce6b2',
              border: '1px solid rgba(20, 184, 166, 0.26)',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            <span style={{ width: 8, height: 8, display: 'inline-block', borderRadius: '50%', background: '#5ce6b2', boxShadow: '0 0 10px rgba(92, 230, 178, 0.7)' }} />
            <span>Recorded recommendation: <b style={{ color: '#94f5c6' }}>{LBL[decisionKey] || 'Submitted'}</b></span>
          </div>

          <div style={{ marginTop: 26, paddingTop: 22, borderTop: '1px solid var(--line)' }}>
            <p className="sm mut" style={{ fontSize: 14, margin: 0, lineHeight: 1.8 }}>
              We appreciate your valuable contribution to the hiring process. You may safely close this window.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="narrow" style={{ maxWidth: 490, margin: '0 auto', paddingTop: 8 }}>
      {head}

      {/* Candidate Profile Summary */}
      <div
        className="card"
        style={{
          marginTop: 12,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px solid var(--line)',
          background: 'var(--card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Av name={d.candidate} small style={{ width: 38, height: 38, fontSize: 14 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                {d.candidate}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '1px 7px',
                  borderRadius: 4,
                  background: 'var(--soft)',
                  color: 'var(--mut)',
                  border: '1px solid var(--line)',
                }}
              >
                {round}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--mut)', marginTop: 2 }}>
              {[d.role || 'Candidate', d.interviewer ? 'by ' + d.interviewer : '', d.scheduled_at ? fmt(d.scheduled_at) : ''].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* Action Links (Meet & CV) */}
        {(d.meet_link || d.cv_url) && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--line)',
              fontSize: 12.5,
            }}
          >
            {d.meet_link && (
              <a
                href={d.meet_link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: 'var(--acc)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                <Icon n="video" s={13} /> Join Meet ↗
              </a>
            )}
            {d.cv_url && (
              <a
                href={d.cv_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                <Icon n="file" s={13} /> {d.cv_filename || 'View CV'} ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* Decision Card */}
      <div
        className="card"
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
            Recommendation
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--mut)' }}>
            Keys 1 · 2 · 3
          </span>
        </div>

        <div className="opts">
          {['proceed', 'hold', 'reject'].map((k, i) => (
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
              Notes (optional)
            </label>
            <span style={{ fontSize: 11, color: 'var(--mut)' }}>
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
          <div className="chips" style={{ marginTop: 10, gap: 6 }}>
            {(CHIPS[pick] || []).map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                onClick={() => setNote((n) => n + (n && !n.endsWith('\n') ? '\n' : '') + '• ' + t)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid rgba(110,231,215,0.12)',
                  background: 'rgba(16,25,32,0.9)',
                  color: 'var(--ink2)',
                  fontSize: 11.5,
                  padding: '5px 10px',
                  borderRadius: 999,
                  transition: 'all 0.2s ease',
                }}
              >
                + {t}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn full primary"
          disabled={!pick || busy}
          onClick={submit}
          style={{
            marginTop: 22,
            padding: '13px 18px',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 12,
            letterSpacing: '0.01em',
            boxShadow: '0 10px 24px rgba(21, 180, 166, 0.22)',
          }}
        >
          {busy ? (
            <><span className="btn-spinner" aria-hidden="true" />Saving…</>
          ) : pick ? (
            `Submit · ${LBL[pick]}`
          ) : (
            'Select a recommendation'
          )}
        </button>

        <p className={'sm ' + (msg ? 'err' : 'mut')} style={{ textAlign: 'center', marginTop: 12, fontSize: 11.5 }}>
          {msg || (pick ? 'Press ⌘/Ctrl + Enter to submit' : 'Choose Proceed, Hold, or Reject')}
        </p>
      </div>
    </div>
  );
}
