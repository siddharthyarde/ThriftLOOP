import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext({ dark: false, toggleDark: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('thrift-dark') === '1'; } catch { return false; }
  });

  const toggleDark = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      try { localStorage.setItem('thrift-dark', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // Sync <html> so any portals / modals outside .thrift-root also pick up dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', dark ? 'dark' : '');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
