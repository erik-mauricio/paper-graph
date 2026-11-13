import { useEffect, useState } from 'react'

const LIGHT = 'paper'
const DARK = 'paper-dark'
// Theme names from before the warm theme, so a saved choice carries over.
const OLD_NAMES: Record<string, string> = { sage: LIGHT, 'sage-dark': DARK }
const STORAGE_KEY = 'theme'
const darkQuery = '(prefers-color-scheme: dark)'

function getSavedTheme(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const t = (saved && OLD_NAMES[saved]) || saved
    return t === LIGHT || t === DARK ? t : null
  } catch {
    return null
  }
}

function systemIsDark() {
  return window.matchMedia(darkQuery).matches
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const saved = getSavedTheme()
    return saved ? saved === DARK : systemIsDark()
  })

  // While the user hasn't picked a theme, keep following the OS setting.
  useEffect(() => {
    const media = window.matchMedia(darkQuery)
    const onChange = (e: MediaQueryListEvent) => {
      if (!getSavedTheme()) setIsDark(e.matches)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function toggle() {
    const next = isDark ? LIGHT : DARK
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage blocked: the theme still applies for this visit.
    }
    setIsDark(!isDark)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`btn btn-ghost btn-circle swap swap-rotate motion-reduce:[&_svg]:transition-none ${
        isDark ? 'swap-active' : ''
      }`}
    >
      <span className="sr-only">Dark mode</span>

      {/* Moon: shown in dark mode */}
      <svg
        className="swap-on size-6"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>

      {/* Sun: shown in light mode */}
      <svg
        className="swap-off size-6"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </button>
  )
}

export default ThemeToggle
