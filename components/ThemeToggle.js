'use client';

import { useEffect, useState } from 'react';

function updateThemeColor(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f7fafb' : '#0b1218');
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = document.documentElement.getAttribute('data-theme');
    const activeTheme = saved === 'light' ? 'light' : 'dark';
    setTheme(activeTheme);
    updateThemeColor(activeTheme);
    setReady(true);
  }, []);

  function chooseTheme(next) {
    if (next === theme) return;
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeColor(next);
    setTheme(next);
  }

  if (!ready) return null;

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button
        type="button"
        className="theme-toggle-option"
        aria-pressed={theme === 'light'}
        onClick={() => chooseTheme('light')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
        <span>Light</span>
      </button>
      <button
        type="button"
        className="theme-toggle-option"
        aria-pressed={theme === 'dark'}
        onClick={() => chooseTheme('dark')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />
        </svg>
        <span>Dark</span>
      </button>
    </div>
  );
}
