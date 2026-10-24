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
    <div className="narrow">
      {head}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="who"><Av name={d.candidate} />
          <div><h1 style={{ fontSize: 20 }}>{d.candidate}</h1><p className="mut sm">{d.role || 'Candidate'}</p></div>
        </div>
        <div className="chips">
          <span className="chip" style={{ background: 'var(--accb)', color: 'var(--acc)' }}>{round}</span>
          {d.scheduled_at && <span className="chip"><Icon n="cal" s={13} />{fmt(d.scheduled_at)}</span>}
          {d.interviewer && <span className="chip"><Icon n="user" s={13} />{d.interviewer}</span>}
        </div>
        {/* Resources for the interviewer */}
        {(d.meet_link || d.cv_url) && (
          <div className="resource-bar">
            {d.meet_link && (
              <a href={d.meet_link} target="_blank" rel="noreferrer" className="meet-link">
                <Icon n="video" s={14} /> Join Google Meet
              </a>
            )}
            {d.cv_url && (
              <a href={d.cv_url} target="_blank" rel="noreferrer" className="cv-link">
                <Icon n="file" s={14} /> {d.cv_filename || 'View CV / Resume'}
              </a>
            )}
          </div>
        )}
      </div>
      <div className="card">
        <h2>Your recommendation</h2>
        <div className="opts">
          {['proceed', 'hold', 'reject'].map((k, i) => (
            <button key={k} className={'opt ' + k} aria-pressed={pick === k} onClick={() => setPick(k)}>
              <span className="ico"><Icon n={ICO[k]} /></span>
              <span><b>{LBL[k]}</b><span className="d">{DESC[k]}</span></span>
              <kbd>{i + 1}</kbd>
            </button>
          ))}
        </div>
        <div className="f">
          <label htmlFor="n">Notes</label>
          <textarea id="n" value={note} maxLength={1500} placeholder={PH[pick]} onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(); }} />
          <div className="chips">
            {(CHIPS[pick] || []).map((t) => (
              <button key={t} className="chip" onClick={() => setNote((n) => n + (n && !n.endsWith('\n') ? '\n' : '') + '• ' + t)}>+ {t}</button>
            ))}
          </div>
          <div className="cnt">{note.length} / 1500</div>
        </div>
        <button className="btn full primary" disabled={!pick || busy} onClick={submit}>
          {busy ? <><span className="btn-spinner" aria-hidden="true" />Saving feedback…</> : <><Icon n="check" s={16} />Submit feedback</>}
        </button>
        <p className={'sm ' + (msg ? 'err' : 'mut')} style={{ textAlign: 'center', marginTop: 10 }}>{msg || (pick ? '' : 'Choose a recommendation to submit.')}</p>
      </div>
    </div>
  );
}
