const P = {
  check: 'M5 12.5l4.5 4.5L19 7.5', pause: 'M9 6v12M15 6v12', x: 'M6 6l12 12M18 6L6 18',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM21 21l-4.3-4.3', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  cal: 'M5 6h14v14H5zM5 10h14M9 3v4M15 3v4', inbox: 'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0', plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  video: 'M4 7.5h10a2.5 2.5 0 0 1 2.5 2.5v4A2.5 2.5 0 0 1 14 16.5H4A2.5 2.5 0 0 1 1.5 14v-4A2.5 2.5 0 0 1 4 7.5zM17.5 10.5L22 7.5v9l-4.5-3z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
};

export function Icon({ n, s = 18, style, className, strokeWidth = 2 }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <path d={P[n]} />
    </svg>
  );
}

export function Av({ name, small }) {
  let h = 0;
  for (const ch of String(name || '?')) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const initials = String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className={'av' + (small ? ' s' : '')} style={{ '--h': h }}>{initials}</span>;
}

export function Logo({ h = 48, style }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="Go Kite Travel & Tours" className="logo" style={{ height: h, ...style }} />;
}

export const LBL = { proceed: 'Proceed', hold: 'Hold', reject: 'Rejected', scheduled: 'Awaiting feedback' };
export const ICO = { proceed: 'check', hold: 'pause', reject: 'x' };
export const COL = { scheduled: ['acc', 'accb'], proceed: ['ok', 'okb'], hold: ['hd', 'hdb'], reject: ['no', 'nob'] };
export const DESC = { proceed: 'Move to the next stage', hold: 'Need more time or information', reject: 'Not the right fit right now' };

export const rname = (r) => 'Round ' + r.round_no + (r.name && r.name !== 'Round ' + r.round_no ? ' · ' + r.name : '');
export const toISO = (v) => (v ? new Date(v).toISOString() : null);

export const fmt = (t) => {
  if (!t) return '';
  const d = new Date(t);
  return isNaN(d) ? '' : d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

export const rel = (t) => {
  if (!t) return '';
  const m = Math.round((Date.now() - new Date(t).getTime()) / 6e4);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  return h < 24 ? h + 'h ago' : Math.round(h / 24) + 'd ago';
};

export async function api(url, opt = {}) {
  const r = await fetch(url, {
    method: opt.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  let d = null;
  try { d = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error((d && d.error) || 'Something went wrong. Please try again.'), { status: r.status });
  return d;
}
