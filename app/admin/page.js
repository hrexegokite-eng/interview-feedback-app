'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Av, Logo, api, fmt, rel, rname, toISO, LBL, COL } from '@/components/ui';

const pending = (c) => c.rounds.find((r) => !r.decision);
const lastDone = (c) => [...c.rounds].reverse().find((r) => r.decision) || {};
const linkOf = (t) => location.origin + '/f/' + t;
async function copy(t) { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } }
const Empty = ({ t, s }) => <div className="empty"><Icon n="inbox" s={30} /><p><b>{t}</b></p><p className="sm">{s}</p></div>;
const Spinner = () => <span className="btn-spinner" aria-hidden="true" />;

function SkeletonRow() {
  return (
    <div className="sk-row">
      <div className="skeleton sk-circle" style={{ width: 32, height: 32, flex: 'none' }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton sk-line" style={{ width: '45%', marginBottom: 7 }} />
        <div className="skeleton sk-line" style={{ width: '70%', height: 10 }} />
      </div>
      <div className="skeleton sk-line" style={{ width: 64, height: 28, borderRadius: 8 }} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="wide" style={{ paddingTop: 28 }}>
      {/* Bar skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26, padding: '12px 18px', background: 'var(--card)', borderRadius: 16, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
          <div className="skeleton sk-line" style={{ width: 140, height: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 8 }} />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="stats" style={{ marginBottom: 4 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="sk-card">
            <div className="skeleton sk-line" style={{ width: '30%', height: 28, marginBottom: 10 }} />
            <div className="skeleton sk-line" style={{ width: '65%', height: 10 }} />
          </div>
        ))}
      </div>
      {/* Tab skeleton */}
      <div className="skeleton" style={{ width: 280, height: 38, borderRadius: 12, margin: '20px 0 16px' }} />
      {/* Content skeleton */}
      <div className="split">
        <div className="sk-card">
          <div className="skeleton sk-line" style={{ width: '55%', marginBottom: 18 }} />
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton sk-line" style={{ height: 38, marginBottom: 12, borderRadius: 10 }} />)}
        </div>
        <div className="sk-card">
          <div className="skeleton sk-line" style={{ width: '40%', marginBottom: 14 }} />
          {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </div>
  );
}

function DelBtn({ onConfirm }) {
  const [arm, setArm] = useState(false);
  return (
    <button className={'btn ghost' + (arm ? ' danger' : '')} aria-label="Delete candidate" onClick={(e) => {
      e.stopPropagation();
      if (arm) { setArm(false); onConfirm(); } else { setArm(true); setTimeout(() => setArm(false), 3000); }
    }}>{arm ? 'Confirm delete' : <><Icon n="trash" s={14} />Delete</>}</button>
  );
}

function LinkBox({ name, l }) {
  return (
    <div className="made">
      <p className="sm"><b>{name}</b> is scheduled. Send this link to the interviewer:</p>
      <div className="link"><input readOnly value={l} onFocus={(e) => e.target.select()} /><button className="btn" onClick={() => copy(l)}>Copy</button></div>
    </div>
  );
}

// CV upload widget used in both Schedule and Profile forms
function CvUpload({ cvUrl, cvFilename, onUploaded, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      onUploaded(d.url, d.filename);
    } catch (e) {
      alert(e.message);
    }
    setUploading(false);
  }

  if (cvUrl) {
    return (
      <div className="upload-preview">
        <Icon n="file" s={15} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cvFilename || 'CV attached'}</span>
        <a href={cvUrl} target="_blank" rel="noreferrer" className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, textDecoration: 'none' }}>
          <Icon n="download" s={13} /> View
        </a>
        <button onClick={onRemove} title="Remove CV">×</button>
      </div>
    );
  }

  return (
    <div
      className={'upload-area' + (drag ? ' drag' : '')}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
    >
      <input
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={(e) => handleFile(e.target.files[0])}
        disabled={uploading}
      />
      <Icon n="upload" s={20} style={{ color: 'var(--mut)' }} />
      <p><b>{uploading ? 'Uploading…' : 'Upload CV / Resume'}</b></p>
      <p>PDF, DOC, or image · drag & drop or click</p>
    </div>
  );
}

export default function Admin() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [cands, setCands] = useState(null);
  const [tab, setTab] = useState('schedule');
  const [filt, setFilt] = useState('all');
  const [q, setQ] = useState('');
  const [prof, setProf] = useState(null);
  const [toast, setToast] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [exporting, setExporting] = useState(false);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 2200); }, []);
  const load = useCallback(async () => {
    try {
      setCands(await api('/api/candidates'));
      setLoadErr('');
    } catch (e) {
      if (e.status === 401) {
        router.replace('/login');
      } else {
        setLoadErr(e.message || 'Failed to load candidates data');
      }
    }
  }, [router]);

  useEffect(() => {
    api('/api/auth/me').then(setMe).catch(() => router.replace('/login'));
    const t0 = setTimeout(load, 0);
    const t = setInterval(load, 15000);
    const f = () => load();
    addEventListener('focus', f);
    return () => { clearTimeout(t0); clearInterval(t); removeEventListener('focus', f); };
  }, [load, router]);

  useEffect(() => {
    const kd = (e) => { if (e.key === 'Escape') setProf(null); };
    addEventListener('keydown', kd);
    return () => removeEventListener('keydown', kd);
  }, []);

  async function logout() { await api('/api/auth/logout', { method: 'POST' }); router.replace('/login'); }
  async function move(id, status) {
    try { await api('/api/candidates/' + id, { method: 'PATCH', body: { status } }); flash('Moved to ' + (status === 'proceed' ? 'Shortlisted' : LBL[status])); load(); }
    catch (e) { flash(e.message); }
  }
  async function remove(id) {
    try { await api('/api/candidates/' + id, { method: 'DELETE' }); setProf(null); flash('Candidate removed'); load(); }
    catch (e) { flash(e.message); }
  }
  async function exportFeedback(format) {
    const records = cands.flatMap((candidate) => candidate.rounds
      .filter((round) => round.decision)
      .map((round) => ({
        candidate: candidate.name,
        bcu: candidate.bcu || '',
        role: candidate.role || '',
        round: round.name || 'Round ' + round.round_no,
        interviewer: round.interviewer || '',
        decision: LBL[round.decision] || round.decision,
        feedback: round.note || '',
        submittedAt: round.submitted_at ? new Date(round.submitted_at) : null,
      })));

    if (!records.length) {
      flash('There is no submitted feedback to export yet.');
      return;
    }

    setExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const headers = ['Candidate', 'BCU', 'Role', 'Interview Round', 'Interviewer', 'Decision', 'Feedback', 'Submitted At'];
      if (format === 'excel') {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Interview Feedback', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.columns = [
          { header: headers[0], key: 'candidate', width: 24 },
          { header: headers[1], key: 'bcu', width: 18 },
          { header: headers[2], key: 'role', width: 28 },
          { header: headers[3], key: 'round', width: 28 },
          { header: headers[4], key: 'interviewer', width: 24 },
          { header: headers[5], key: 'decision', width: 16 },
          { header: headers[6], key: 'feedback', width: 60 },
          { header: headers[7], key: 'submittedAt', width: 22, style: { numFmt: 'dd mmm yyyy hh:mm' } },
        ];
        sheet.addRows(records);
        sheet.autoFilter = { from: 'A1', to: 'H1' };
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B65' } };
        sheet.getColumn('feedback').alignment = { vertical: 'top', wrapText: true };
        const buffer = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `interview-feedback-${date}.xlsx`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text('Interview Feedback', 14, 14);
        doc.setFontSize(9);
        doc.text(`${records.length} submitted feedback record${records.length === 1 ? '' : 's'}`, 14, 20);
        autoTable(doc, {
          head: [headers],
          body: records.map((record) => [
            record.candidate,
            record.bcu,
            record.role,
            record.round,
            record.interviewer,
            record.decision,
            record.feedback,
            record.submittedAt ? record.submittedAt.toLocaleString() : '',
          ]),
          startY: 24,
          margin: { left: 10, right: 10, bottom: 12 },
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [23, 107, 101] },
          columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 20 }, 2: { cellWidth: 32 }, 3: { cellWidth: 34 }, 4: { cellWidth: 28 }, 5: { cellWidth: 20 }, 6: { cellWidth: 'auto' }, 7: { cellWidth: 30 } },
          didDrawPage: () => {
            doc.setFontSize(8);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 18, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
          },
        });
        doc.save(`interview-feedback-${date}.pdf`);
      }
    } catch (e) {
      flash(`Export failed: ${e.message || 'Please try again.'}`);
    } finally {
      setExporting(false);
    }
  }

  if (loadErr) {
    return (
      <div className="narrow center" style={{ paddingTop: 80 }}>
        <Logo h={56} style={{ margin: '0 auto 20px' }} />
        <h2>Unable to load dashboard data</h2>
        <p className="err shake" style={{ marginTop: 14 }}>{loadErr}</p>
        <button className="btn primary" onClick={() => { setLoadErr(''); load(); }} style={{ marginTop: 20 }}>
          Retry
        </button>
      </div>
    );
  }

  if (!me || !cands) return <LoadingSkeleton />;

  const cnt = (s) => cands.filter((c) => c.status === s).length;
  const stats = [['Awaiting feedback', 'scheduled', 'var(--acc)', 'schedule', 'all'], ['Shortlisted', 'proceed', 'var(--ok)', 'proceed', 'all'], ['On hold', 'hold', 'var(--hd)', 'other', 'hold'], ['Rejected', 'reject', 'var(--no)', 'other', 'reject']];
  const tabs = [['schedule', 'Schedule'], ['proceed', 'Shortlisted', cnt('proceed')], ['other', 'Hold & Rejected', cnt('hold') + cnt('reject')]];
  const open = (id) => setProf(id);
  const profile = cands.find((c) => c.id === prof);
  const feedbackCount = cands.reduce((total, candidate) => total + candidate.rounds.filter((round) => round.decision).length, 0);

  const s = q.toLowerCase();
  const set = tab === 'proceed' ? ['proceed'] : filt === 'all' ? ['hold', 'reject'] : [filt];
  const list = cands.filter((c) => set.includes(c.status) && (!s || [c.name, c.role, ...c.rounds.map((r) => [r.note, r.interviewer, r.name].join(' '))].join(' ').toLowerCase().includes(s)));

  return (
    <div className="page-shell">
      <div className="shell-panel workspace-panel">
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}><Logo h={48} /><span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>Interview Feedback</span></div>
          <div className="me">
            <button className="btn ghost" onClick={() => router.push('/portal')} title="Back to Workspace Portal" style={{ fontSize: 13, padding: '6px 12px' }}>
              ← All Modules
            </button>
            <Av name={me.email} small />
            <span>{me.email}</span>
            <button className="btn ghost" onClick={logout}>Sign out</button>
          </div>
        </div>

        <div className="stats">
          {stats.map(([l, st, c, t, f]) => (
            <button key={l} className="stat" onClick={() => { setTab(t); setFilt(f); setQ(''); }}>
              <div className="n">{cnt(st)}</div><div className="l"><i style={{ background: c }} />{l}</div>
            </button>
          ))}
        </div>

        <div className="seg" role="tablist">
          {tabs.map(([k, l, c]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); if (k !== 'other') setFilt('all'); setQ(''); }}>{l}{c != null && <b>{c}</b>}</button>
          ))}
        </div>

        {profile ? <Profile key={profile.id} c={profile} close={() => setProf(null)} reload={load} flash={flash} move={move} remove={remove} /> : tab === 'schedule' ? <Schedule cands={cands} reload={load} flash={flash} open={open} /> : (
          <>
            <div className="tools">
              <div className="sbox"><Icon n="search" s={16} /><input placeholder="Search name, role or notes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              {tab === 'other' && (
                <div className="seg" style={{ margin: 0 }}>
                  {[['all', 'All'], ['hold', 'Hold'], ['reject', 'Rejected']].map(([k, l]) => <button key={k} role="tab" aria-selected={filt === k} onClick={() => setFilt(k)}>{l}</button>)}
                </div>
              )}
              <div className="export-actions">
                <button className="btn ghost" disabled={exporting || !feedbackCount} title="Download all submitted feedback as an Excel workbook" onClick={() => exportFeedback('excel')}>Excel</button>
                <button className="btn ghost" disabled={exporting || !feedbackCount} title="Download all submitted feedback as a PDF" onClick={() => exportFeedback('pdf')}>PDF</button>
              </div>
            </div>
            <div className="card">
              {list.length ? list.map((c) => {
                const d = lastDone(c);
                return (
                  <div key={c.id} className="row" data-id={c.id} style={{ alignItems: 'flex-start' }} onClick={() => open(c.id)}>
                    <Av name={c.name} small />
                    <div className="grow">
                      <b>{c.name}</b> <span className={'badge ' + c.status} style={{ marginLeft: 6 }}>{LBL[c.status]}</span>
                      <div className="sm mut">{[c.role, c.rounds.length + (c.rounds.length > 1 ? ' rounds' : ' round'), d.interviewer ? 'by ' + d.interviewer : '', rel(d.submitted_at)].filter(Boolean).join(' · ')}</div>
                      {d.note && <div className="note">{d.note}</div>}
                    </div>
                    <div className="acts" onClick={(e) => e.stopPropagation()}>
                      <button className="btn ghost" onClick={() => open(c.id)}><Icon n="plus" s={14} />Next round</button>
                      {['proceed', 'hold', 'reject'].filter((k) => k !== c.status).map((k) => <button key={k} className="btn ghost" onClick={() => move(c.id, k)}>{k === 'proceed' ? 'Shortlist' : LBL[k]}</button>)}
                      <DelBtn onConfirm={() => remove(c.id)} />
                    </div>
                  </div>
                );
              }) : <Empty t={s ? 'No matches' : 'Nothing here yet'} s={s ? 'Try a different search.' : 'Candidates appear once an interviewer submits feedback.'} />}
            </div>
          </>
        )}

        <div className={'toast' + (toast ? ' on' : '')}>{toast}</div>
      </div>
    </div>
  );
}

function Schedule({ cands, reload, flash, open }) {
  const blank = { name: '', bcu: '', role: '', roundName: '', interviewer: '', when: '', meetLink: '', cvUrl: '', cvFilename: '' };
  const [f, setF] = useState(blank);
  const [badName, setBadName] = useState(false);
  const [badInterviewer, setBadInterviewer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function add(e) {
    e.preventDefault();
    const nameMissing = !f.name.trim();
    const interviewerMissing = !f.interviewer.trim();
    setBadName(nameMissing);
    setBadInterviewer(interviewerMissing);
    if (nameMissing || interviewerMissing) return;
    setBusy(true);
    try {
      const r = await api('/api/candidates', { method: 'POST', body: { ...f, when: toISO(f.when) } });
      const l = linkOf(r.token);
      setMade({ name: f.name, l }); copy(l); setF(blank); reload();
    } catch (x) { flash(x.message); }
    setBusy(false);
  }

  const w = cands.filter((c) => c.status === 'scheduled');
  return (
    <div className="split">
      <form className="card" onSubmit={add}>
        <h2>Add candidate &amp; schedule Round 1</h2>
        <div className="f"><label htmlFor="nm">Candidate name <span className="req">*</span></label><input id="nm" required className={badName ? 'bad' : ''} placeholder="e.g. Priya Sharma" autoComplete="off" value={f.name} onChange={on('name')} /></div>
        <div className="f"><label htmlFor="bcu">BCU</label><input id="bcu" placeholder="Enter BCU" value={f.bcu} onChange={on('bcu')} /></div>
        <div className="f"><label htmlFor="rl">Role</label><input id="rl" placeholder="e.g. Travel Consultant" value={f.role} onChange={on('role')} /></div>
        <div className="f"><label htmlFor="rn">Round name (optional)</label><input id="rn" placeholder="e.g. Screening" value={f.roundName} onChange={on('roundName')} /></div>
        <div className="f"><label htmlFor="iv">Interviewer name <span className="req">*</span></label><input id="iv" required className={badInterviewer ? 'bad' : ''} placeholder="e.g. Rahul Mehta" value={f.interviewer} onChange={on('interviewer')} /></div>
        <div className="f"><label htmlFor="wh">Date &amp; time</label><input id="wh" type="datetime-local" value={f.when} onChange={on('when')} /></div>
        <div className="f">
          <label htmlFor="ml">Google Meet link (optional)</label>
          <input id="ml" type="url" placeholder="https://meet.google.com/xxx-xxxx-xxx" value={f.meetLink} onChange={on('meetLink')} />
        </div>
        <div className="f">
          <label>CV / Resume (optional)</label>
          <CvUpload
            cvUrl={f.cvUrl}
            cvFilename={f.cvFilename}
            onUploaded={(url, filename) => setF({ ...f, cvUrl: url, cvFilename: filename })}
            onRemove={() => setF({ ...f, cvUrl: '', cvFilename: '' })}
          />
        </div>
        <button className="btn full primary" disabled={busy} style={{ marginTop: 20 }}>
          {busy ? <><Spinner />Scheduling…</> : <><Icon n="cal" s={15} />Schedule & get feedback link</>}
        </button>
        {made && <LinkBox name={made.name} l={made.l} />}
      </form>
      <div className="card">
        <h2>Awaiting feedback</h2>
        <div className="f">
          {w.length ? w.map((c) => {
            const r = pending(c) || c.rounds[c.rounds.length - 1];
            return (
              <div key={c.id} className="row" data-id={c.id} onClick={() => open(c.id)}>
                <Av name={c.name} small />
                <div className="grow">
                  <b>{c.name}</b>
                  <div className="sm mut">{[c.bcu ? 'BCU: ' + c.bcu : '', rname(r), c.role, r.interviewer, fmt(r.scheduled_at)].filter(Boolean).join(' · ')}</div>
                  {(r.meet_link || r.cv_url) && (
                    <div className="resource-bar" onClick={(e) => e.stopPropagation()}>
                      {r.meet_link && <a href={r.meet_link} target="_blank" rel="noreferrer" className="meet-link"><Icon n="video" s={13} className="field-icon" />Join Meet</a>}
                      {r.cv_url && <a href={r.cv_url} target="_blank" rel="noreferrer" className="cv-link"><Icon n="file" s={13} className="field-icon" />{r.cv_filename || 'View CV'}</a>}
                    </div>
                  )}
                </div>
                <div className="acts" onClick={(e) => e.stopPropagation()}>
                  <button className="btn ghost" onClick={async () => flash((await copy(linkOf(r.token))) ? 'Link copied' : 'Copy failed')}><Icon n="link" s={14} />Copy link</button>
                  <DelBtn onConfirm={async () => { try { await api('/api/candidates/' + c.id, { method: 'DELETE' }); flash('Candidate removed'); reload(); } catch (x) { flash(x.message); } }} />
                </div>
              </div>
            );
          }) : <Empty t="Nothing pending" s="Schedule an interview to generate a feedback link." />}
        </div>
      </div>
    </div>
  );
}

function Profile({ c, close, reload, flash, move, remove }) {
  const R = c.rounds;
  const pend = pending(c);
  const n = (R.length ? R[R.length - 1].round_no : 0) + 1;
  const [f, setF] = useState({ roundName: '', interviewer: '', when: '', meetLink: '', cvUrl: '', cvFilename: '' });
  const [badInterviewer, setBadInterviewer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function next(e) {
    e.preventDefault();
    const interviewerMissing = !f.interviewer.trim();
    setBadInterviewer(interviewerMissing);
    if (interviewerMissing) return;
    setBusy(true);
    try {
      const r = await api('/api/candidates/' + c.id + '/rounds', { method: 'POST', body: { ...f, when: toISO(f.when) } });
      const l = linkOf(r.token);
      setMade(l); copy(l); flash('Round ' + r.round_no + ' scheduled'); reload();
    } catch (x) { flash(x.message); }
    setBusy(false);
  }

  return (
    <section className="candidate-workspace" aria-label="Candidate profile">
      <div className="profile-header"><button className="profile-back" onClick={close} aria-label="Back to candidate list"><Icon n="x" s={14} />Back</button><span className="sm mut">Candidate profile</span></div>
        <div className="who" style={{ marginTop: 18 }}>
          <Av name={c.name} />
          <div><h1 style={{ fontSize: 22 }}>{c.name}</h1><p className="mut sm">{[c.bcu ? 'BCU: ' + c.bcu : '', c.role || 'Candidate', R.length + (R.length === 1 ? ' round' : ' rounds')].filter(Boolean).join(' · ')}</p></div>
          <span className={'badge ' + c.status} style={{ marginLeft: 'auto' }}>{LBL[c.status]}</span>
        </div>
        <div className="chips" style={{ marginTop: 16 }}>
          {R.map((r) => <span key={r.id} className={'badge ' + (r.decision || 'scheduled')}>R{r.round_no} · {LBL[r.decision || 'scheduled']}</span>)}
        </div>
        <h2 style={{ marginTop: 22 }}>Feedback history</h2>
        <div className="tl" style={{ marginTop: 12 }}>
          {R.map((r) => {
            const st = r.decision || 'scheduled';
            return (
              <div key={r.id} className="rd" style={{ '--c': `var(--${COL[st][0]})` }}>
                <div className="card">
                  <div className="top"><b>{rname(r)}</b><span className={'badge ' + st}>{LBL[st]}</span></div>
                  <div className="sm mut" style={{ marginTop: 2 }}>{[r.interviewer ? 'Interviewer: ' + r.interviewer : '', r.scheduled_at ? 'Interview ' + fmt(r.scheduled_at) : '', r.decision ? 'Submitted ' + fmt(r.submitted_at) : ''].filter(Boolean).join(' · ')}</div>
                  {/* Meet link & CV links */}
                  {(r.meet_link || r.cv_url) && (
                    <div className="resource-bar">
                      {r.meet_link && <a href={r.meet_link} target="_blank" rel="noreferrer" className="meet-link"><Icon n="video" s={13} className="field-icon" />Join Meet</a>}
                      {r.cv_url && <a href={r.cv_url} target="_blank" rel="noreferrer" className="cv-link"><Icon n="file" s={13} className="field-icon" />{r.cv_filename || 'View CV'}</a>}
                    </div>
                  )}
                  {r.note ? <div className="note">{r.note}</div> : r.decision ? <p className="sm mut" style={{ marginTop: 8 }}>No notes added.</p> : null}
                  {!r.decision && <div style={{ marginTop: 12 }}><button className="btn ghost" onClick={async () => flash((await copy(linkOf(r.token))) ? 'Link copied' : 'Copy failed')}><Icon n="link" s={14} />Copy feedback link</button></div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="card" style={{ marginTop: 6 }}>
          {pend ? <p className="sm mut">{rname(pend)} is awaiting feedback. You can schedule the next round once it's submitted.</p> : (
            <form onSubmit={next}>
              <h2>Schedule Round {n}</h2>
              <div className="f"><label htmlFor="pr">Round name (optional)</label><input id="pr" placeholder="e.g. Technical, Manager, HR" value={f.roundName} onChange={on('roundName')} /></div>
              <div className="f"><label htmlFor="pi">Interviewer name <span className="req">*</span></label><input id="pi" required className={badInterviewer ? 'bad' : ''} value={f.interviewer} onChange={on('interviewer')} /></div>
              <div className="f"><label htmlFor="pw">Date &amp; time</label><input id="pw" type="datetime-local" value={f.when} onChange={on('when')} /></div>
              <div className="f">
                <label htmlFor="pm">Google Meet link (optional)</label>
                <input id="pm" type="url" placeholder="https://meet.google.com/xxx-xxxx-xxx" value={f.meetLink} onChange={on('meetLink')} />
              </div>
              <div className="f">
                <label>CV / Resume (optional)</label>
                <CvUpload
                  cvUrl={f.cvUrl}
                  cvFilename={f.cvFilename}
                  onUploaded={(url, filename) => setF({ ...f, cvUrl: url, cvFilename: filename })}
                  onRemove={() => setF({ ...f, cvUrl: '', cvFilename: '' })}
                />
              </div>
              <button className="btn full primary" disabled={busy} style={{ marginTop: 20 }}>
                {busy ? <><Spinner />Scheduling…</> : <><Icon n="cal" s={15} />Schedule Round {n} & get link</>}
              </button>
              {made && <div className="made"><p className="sm">Send this link to the interviewer:</p><div className="link"><input readOnly value={made} onFocus={(e) => e.target.select()} /><button type="button" className="btn" onClick={() => copy(made)}>Copy</button></div></div>}
            </form>
          )}
        </div>
        <div className="chips" style={{ marginTop: 18 }}>
          {!pend && ['proceed', 'hold', 'reject'].filter((k) => k !== c.status).map((k) => <button key={k} className="btn ghost" onClick={() => move(c.id, k)}>{k === 'proceed' ? 'Mark shortlisted' : 'Mark ' + LBL[k].toLowerCase()}</button>)}
          <span style={{ marginLeft: 'auto' }}><DelBtn onConfirm={() => remove(c.id)} /></span>
        </div>
    </section>
  );
}
