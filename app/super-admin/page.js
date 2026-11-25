'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Av, Icon, LoadingState, Logo, api, fmt } from '@/components/ui';
import FeedbackForms from './FeedbackForms';

const MODULE_NAMES = {
  'interview-feedback': 'Interview Feedback',
  'exit-form': 'Exit Form',
};

function formatStorage(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  const digits = value < 10 && unitIndex > 0 ? 2 : value < 100 && unitIndex > 0 ? 1 : 0;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value)} ${units[unitIndex]}`;
}

export default function SuperAdmin() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('settings');

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
    return <LoadingState label="Loading super admin panel" />;
  }

  const storage = data?.storage;
  const storagePercent = storage?.limitBytes
    ? (storage.usedBytes / storage.limitBytes) * 100
    : null;
  const storageProgress = storagePercent === null ? 0 : Math.min(Math.max(storagePercent, 0), 100);
  const storageColor = storagePercent >= 90 ? 'var(--no)' : storagePercent >= 75 ? 'var(--hd)' : 'var(--acc)';
  const storageRemaining = storage?.limitBytes
    ? Math.max(storage.limitBytes - storage.usedBytes, 0)
    : null;

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

        <div className="super-admin-heading">
          <div>
            <h1 style={{ margin: 0, fontSize: 25 }}>Workspace administration</h1>
            <p className="sm mut" style={{ marginTop: 6 }}>Manage workspace access, SBU-specific feedback forms, and recent activity.</p>
            <p className="sm mut" style={{ marginTop: 4 }}>
              {data?.counts.candidates ?? 0} candidate records · {data?.counts.onboarding ?? 0} onboarded
            </p>
          </div>
          <button className="btn primary" onClick={() => router.push('/admin')}><Icon n="user" s={15} />Manage candidates</button>
        </div>

        {error && <p className="err" role="alert">{error}</p>}
        {message && <p className="sm" role="status" style={{ color: 'var(--ok)', marginBottom: 14 }}>{message}</p>}

        <div className="seg" role="tablist" aria-label="Super admin sections" style={{ marginBottom: 18 }}>
          <button role="tab" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}>Workspace settings</button>
          <button role="tab" aria-selected={tab === 'forms'} onClick={() => setTab('forms')}>Feedback forms</button>
          <button role="tab" aria-selected={tab === 'storage'} onClick={() => setTab('storage')}>Database storage</button>
        </div>

        {tab === 'forms' && <FeedbackForms />}

        {tab === 'storage' && (
          <section className="card database-storage">
            <div>
              <h2>Database storage</h2>
              <p className="sm mut">Current PostgreSQL database size and configured capacity.</p>
            </div>
            <div className="storage-metrics">
              <div className="storage-metric">
                <span className="sm mut">Used</span>
                <strong>{formatStorage(storage?.usedBytes)}</strong>
              </div>
              <div className="storage-metric">
                <span className="sm mut">Configured capacity</span>
                <strong>{storage?.limitBytes ? formatStorage(storage.limitBytes) : 'Not configured'}</strong>
              </div>
              <div className="storage-metric">
                <span className="sm mut">{storagePercent !== null && storagePercent > 100 ? 'Over capacity' : 'Available'}</span>
                <strong>
                  {storagePercent === null
                    ? '—'
                    : storagePercent > 100
                      ? formatStorage(storage.usedBytes - storage.limitBytes)
                      : formatStorage(storageRemaining)}
                </strong>
              </div>
            </div>
            {storagePercent !== null && (
              <>
                <div
                  className="storage-meter"
                  role="progressbar"
                  aria-label="Database storage used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(storageProgress)}
                  aria-valuetext={`${formatStorage(storage.usedBytes)} of ${formatStorage(storage.limitBytes)} used`}
                >
                  <span style={{ width: `${storageProgress}%`, background: storageColor }} />
                </div>
                <p className="sm mut storage-caption">
                  {storagePercent.toFixed(1)}% of configured capacity used.
                </p>
              </>
            )}
            {storage?.configError ? (
              <p className="storage-warning" role="alert">{storage.configError}</p>
            ) : !storage?.limitBytes ? (
              <p className="sm mut storage-caption">
                Set <code>DATABASE_STORAGE_LIMIT_GB</code> to display a capacity and usage bar. The configured capacity is informational and does not enforce a database quota.
              </p>
            ) : null}
          </section>
        )}

        {tab === 'settings' && <>
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
        </>}
      </div>
    </div>
  );
}
