'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Av, Logo, api } from '@/components/ui';

export default function ExitEmployeeProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/exit-interviews/employees/${id}`)
      .then(setEmployee)
      .catch((reason) => {
        if (reason.status === 401) router.replace('/login');
        else setError(reason.message);
      });
  }, [id, router]);

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
            <span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>Employee Profile</span>
          </div>
          <div className="me">
            <button className="btn ghost" onClick={() => router.push('/exit-interviews')}>← Exit Interviews</button>
            <button className="btn ghost" onClick={() => router.push('/portal')}>All Modules</button>
            <button className="btn ghost" onClick={logout}>Sign out</button>
          </div>
        </div>

        {error ? <p className="err" role="alert">{error}</p> : !employee ? <p className="mut">Loading employee profile…</p> : (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <Av name={employee.name} />
              <div>
                <h1>{employee.name}</h1>
                <p className="mut">{employee.email}</p>
                <p className="sm mut" style={{ marginTop: 4 }}>Employee profile · {employee.interviews.length} exit interview{employee.interviews.length === 1 ? '' : 's'}</p>
              </div>
            </div>

            <div className="card">
              <h2>Exit interview history</h2>
              {!employee.interviews.length ? <p className="mut" style={{ marginTop: 16 }}>No exit interviews recorded for this employee.</p> : employee.interviews.map((interview) => (
                <article key={interview.id} style={{ padding: '18px 0', borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <b>{interview.title}</b>
                      <div className="sm mut">{interview.submitted_at ? `Submitted ${new Date(interview.submitted_at).toLocaleString()}` : 'Awaiting employee response'}</div>
                    </div>
                    <span className={`badge ${interview.submitted_at ? 'proceed' : 'scheduled'}`}>{interview.submitted_at ? 'Submitted' : 'Pending'}</span>
                  </div>
                  {interview.description && <p className="sm mut" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{interview.description}</p>}
                  {interview.submitted_at ? interview.questions.map((question) => (
                    <div key={question.id} style={{ marginTop: 14 }}>
                      <div className="sm"><b>{question.label}</b></div>
                      <div className="sm mut" style={{ whiteSpace: 'pre-wrap' }}>{interview.answers?.[question.id] || 'No response'}</div>
                    </div>
                  )) : <p className="sm mut" style={{ marginTop: 12 }}>Responses will appear here after the employee submits the form.</p>}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
