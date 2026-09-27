import React, { useEffect } from 'react';
import { useAppStore } from './Store';

interface LayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

export function Layout({ sidebar, main }: LayoutProps) {
  const activeConversationId = useAppStore((s) => s.activeConversationId);

  return (
    <div className={`app-layout${activeConversationId ? ' chat-open' : ''}`}>
      <aside className="sidebar">{sidebar}</aside>
      <main className="main-content">{main}</main>
    </div>
  );
}

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      useAppStore.setState({ resolvedTheme: e.matches ? 'dark' : 'light' });
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, resolvedTheme, setTheme };
}
