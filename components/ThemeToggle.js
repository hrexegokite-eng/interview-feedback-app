'use client';

import { useEffect, useState } from 'react';

function updateThemeColor(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f7fafb' : '#0b1218');
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = document.documentElement.getAttribute('data-theme');
    const activeTheme = saved === 'light' ? 'light' : 'dark';
    setTheme(activeTheme);
    updateThemeColor(activeTheme);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeColor(next);
    setTheme(next);
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-icon sun">☀</span>
        <span className="theme-toggle-icon moon">☾</span>
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}
