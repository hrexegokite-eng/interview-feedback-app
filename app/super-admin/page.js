'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Av, Icon, Logo, api, fmt } from '@/components/ui';

const MODULE_NAMES = {
  'interview-feedback': 'Interview Feedback',
  'exit-form': 'Exit Form',
};

export default function SuperAdmin() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const currentUser = await api('/api/auth/me');
      if (currentUser.role !== 'superadmin') {
        router.replace('/portal');
        return;
      }
      setMe(currentUser);
      setData(await api('/api/super-admin'));
      setError('');
    } catch (loadError) {
      if (loadError.status === 401) router.replace('/login');
      else setError(loadError.message || 'Unable to load super admin settings.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function addAdmin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/api/super-admin', { method: 'POST', body: { email } });
      setEmail('');
      setMessage('Admin access granted.');
      await load();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeAdmin(targetEmail) {
    if (!window.confirm(`Remove admin access for ${targetEmail}?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/api/super-admin', { method: 'DELETE', body: { email: targetEmail } });
      setMessage(`Admin access removed for ${targetEmail}.`);
      await load();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  async function setModule(key, enabled) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/api/super-admin', { method: 'PATCH', body: { key, enabled } });
      setMessage(`${MODULE_NAMES[key]} ${enabled ? 'enabled' : 'disabled'}.`);
      await load();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  if (loading) {
    return <div className="wide center" style={{ paddingTop: 100 }}><Logo h={60} /><p className="mut">Loading super admin panel…</p></div>;
  }

  return (
    <div className="page-shell">
      <div className="shell-panel workspace-panel">
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={44} />
            <span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>Super Admin</span>
          </div>
          <div className="me">
            <Av name={me?.name || me?.email} small />
            <span>{me?.email}</span>
            <button className="btn ghost" onClick={() => router.push('/portal')}>Workspace</button>
            <button className="btn ghost" onClick={logout}>Sign out</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, margin: '26px 0 18px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 25 }}>Workspace administration</h1>
            <p className="sm mut" style={{ marginTop: 6 }}>Manage administrator access, active modules, and review recent activity.</p>
            <p className="sm mut" style={{ marginTop: 4 }}>
              {data?.counts.candidates ?? 0} candidate records · {data?.counts.onboarding ?? 0} scheduled for onboarding
            </p>
          </div>
          <button className="btn primary" onClick={() => router.push('/admin')}><Icon n="user" s={15} />Manage candidates</button>
        </div>

        {error && <p className="err" role="alert">{error}</p>}
        {message && <p className="sm" role="status" style={{ color: 'var(--ok)', marginBottom: 14 }}>{message}</p>}

        <div className="split">
          <section className="card">
            <h2>Admin access</h2>
            <p className="sm mut">Only listed accounts can sign in. The super admin account cannot be removed.</p>
            <form onSubmit={addAdmin} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
              <input aria-label="Admin email address" type="email" required maxLength={254} placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} style={{ flex: 1, minWidth: 0 }} />
              <button className="btn primary" type="submit" disabled={busy}>Add admin</button>
            </form>
            <div>
              {data?.admins.map((admin) => (
                <div key={admin.email} className="row">
                  <Av name={admin.email} small />
                  <div className="grow">
                    <b>{admin.email}</b>
                    <div className="sm mut">{admin.role === 'superadmin' ? 'Super admin' : 'Admin'} · Added {fmt(admin.created_at)}</div>
                  </div>
                  {admin.role !== 'superadmin' && (
                    <button className="btn ghost danger" disabled={busy} onClick={() => removeAdmin(admin.email)}>Remove</button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Active workspace modules</h2>
            <p className="sm mut">Enabled modules appear on the workspace portal.</p>
            <div style={{ marginTop: 14 }}>
              {data?.modules.map((module) => (
                <label key={module.key} className="row" style={{ cursor: 'pointer' }}>
                  <span className="grow">
                    <b>{MODULE_NAMES[module.key] || module.key}</b>
                    <span className="sm mut" style={{ display: 'block' }}>{module.enabled ? 'Visible on the portal' : 'Hidden from the portal'}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={module.enabled}
                    disabled={busy}
                    onChange={(event) => setModule(module.key, event.target.checked)}
                    aria-label={`${module.enabled ? 'Disable' : 'Enable'} ${MODULE_NAMES[module.key] || module.key}`}
                    style={{ width: 20, height: 20, accentColor: 'var(--acc)' }}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        <section className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Recent admin activity</h2>
              <p className="sm mut">Latest 100 recorded management and candidate actions.</p>
            </div>
            <button className="btn ghost" disabled={busy} onClick={load}>Refresh</button>
          </div>
          {data?.audit.length ? data.audit.map((entry) => (
            <div key={entry.id} className="row">
              <div className="grow">
                <b>{entry.action.replaceAll('.', ' ')}</b>
                <div className="sm mut">{entry.actor_email}{entry.target ? ` · ${entry.target}` : ''}{` · ${fmt(entry.created_at)}`}</div>
              </div>
            </div>
          )) : <p className="sm mut" style={{ marginTop: 14 }}>No admin actions recorded yet.</p>}
        </section>
      </div>
    </div>
  );
}
