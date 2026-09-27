import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type VaultState = 'locked' | 'unlocking' | 'unlocked';
export type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'degraded';

export interface AppStore {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';

  // Vault
  vaultState: VaultState;
  setVaultState: (state: VaultState) => void;

  // Connection
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Navigation
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;

  // Auth
  hasIdentity: boolean;
  setHasIdentity: (v: boolean) => void;

  // Locale
  locale: string;
  setLocale: (code: string) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getPersistedTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem('crow-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {}
  return 'system';
}

function getPersistedLocale(): string {
  try {
    const stored = localStorage.getItem('crow-locale');
    if (stored) return stored;
  } catch {}
  return typeof navigator !== 'undefined' ? (navigator.language || 'en').split('-')[0] : 'en';
}

const initialTheme = getPersistedTheme();

export const useAppStore = create<AppStore>((set, _get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    try { localStorage.setItem('crow-theme', theme); } catch {}
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    set({ theme, resolvedTheme: resolved });
  },
  resolvedTheme: initialTheme === 'system' ? getSystemTheme() : initialTheme,

  vaultState: 'locked',
  setVaultState: (vaultState) => set({ vaultState }),

  connectionStatus: 'offline',
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),

  hasIdentity: false,
  setHasIdentity: (v) => set({ hasIdentity: v }),

  locale: getPersistedLocale(),
  setLocale: (locale) => {
    try { localStorage.setItem('crow-locale', locale); } catch {}
    set({ locale });
  },
}));

// Initialize theme on load
if (typeof document !== 'undefined') {
  const theme = useAppStore.getState().theme;
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}
