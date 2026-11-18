import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/** Light/dark toggle shown at the top-right of the auth cards (login, register). */
export const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bento-card text-xs font-semibold text-slate-200 hover:border-violet-500/40 transition-all cursor-pointer"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span>Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-violet-600" />
          <span>Modo Escuro</span>
        </>
      )}
    </button>
  );
};
