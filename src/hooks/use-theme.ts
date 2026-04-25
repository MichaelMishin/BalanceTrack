import { useState, useEffect, useCallback } from 'react'

const THEME_KEY = 'balancetrack-theme'

type Theme = 'dark' | 'light'

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage unavailable
  }
  return 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('light')
  } else {
    root.classList.remove('light')
  }
}

// Apply on initial load (before React hydration)
applyTheme(getStoredTheme())

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  // Sync DOM on mount in case SSR/hydration mismatch
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const isDark = theme === 'dark'

  return { theme, isDark, setTheme, toggleTheme }
}
