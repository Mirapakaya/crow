import { create } from 'zustand';
import type { Conversation, Contact, Message } from '@models';
import type { RelayPool } from '@transport/relayPool';
import type { CallManager } from '@calls/callManager';

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

  // Identity
  identityPubKey: string | null;
  setIdentityPubKey: (key: string | null) => void;
  /** Private key held only when vault is unlocked; cleared on lock. */
  identityPrivateKey: Uint8Array | null;
  setIdentityPrivateKey: (key: Uint8Array | null) => void;

  // Connection
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Navigation
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;

  // Hash-based route
  route: string;
  routeParams: Record<string, string>;
  navigate: (path: string) => void;

  // Auth
  hasIdentity: boolean;
  setHasIdentity: (v: boolean) => void;

  // Locale
  locale: string;
  setLocale: (code: string) => void;

  // Conversations
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, patch: Partial<Conversation>) => void;

  // Messages (keyed by conversationId)
  messages: Map<string, Message[]>;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<Message>) => void;

  // Contacts
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;

  // Relay pool
  relayPool: RelayPool | null;
  setRelayPool: (pool: RelayPool | null) => void;

  // Call manager
  callManager: CallManager | null;
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

function parseHashRoute(): { route: string; params: Record<string, string> } {
  if (typeof window === 'undefined') return { route: '/', params: {} };
  const hash = window.location.hash.replace(/^#\/?/, '') || '';
  const segments = hash.split('/').filter(Boolean);
  const route = '/' + (segments[0] || '');
  const params: Record<string, string> = {};
  // e.g. #/chatView/abc123 → params.id = abc123
  if (segments.length > 1) {
    params.id = segments.slice(1).join('/');
  }
  return { route, params };
}

const initialTheme = getPersistedTheme();
const initialRoute = parseHashRoute();

export const useAppStore = create<AppStore>((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    try {
      localStorage.setItem('crow-theme', theme);
    } catch {}
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    set({ theme, resolvedTheme: resolved });
  },
  resolvedTheme: initialTheme === 'system' ? getSystemTheme() : initialTheme,

  vaultState: 'locked',
  setVaultState: (vaultState) => set({ vaultState }),

  identityPubKey: null,
  setIdentityPubKey: (key) => set({ identityPubKey: key }),
  identityPrivateKey: null,
  setIdentityPrivateKey: (key) => {
    // Securely clear the old key before replacing
    const old = get().identityPrivateKey;
    if (old) old.fill(0);
    set({ identityPrivateKey: key });
  },

  connectionStatus: 'offline',
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),

  route: initialRoute.route,
  routeParams: initialRoute.params,
  navigate: (path) => {
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
    const parsed = parseHashRoute();
    set({ route: parsed.route, routeParams: parsed.params });
  },

  hasIdentity: false,
  setHasIdentity: (v) => set({ hasIdentity: v }),

  locale: getPersistedLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem('crow-locale', locale);
    } catch {}
    set({ locale });
  },

  conversations: [],
  setConversations: (convs) => set({ conversations: convs }),
  addConversation: (conv) => set((s) => ({ conversations: [...s.conversations, conv] })),
  updateConversation: (id, patch) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  messages: new Map(),
  addMessage: (conversationId, message) =>
    set((s) => {
      const next = new Map(s.messages);
      const list = [...(next.get(conversationId) ?? []), message];
      next.set(conversationId, list);
      return { messages: next };
    }),
  updateMessage: (conversationId, messageId, patch) =>
    set((s) => {
      const next = new Map(s.messages);
      const list = (next.get(conversationId) ?? []).map((m) =>
        m.id === messageId ? { ...m, ...patch } : m,
      );
      next.set(conversationId, list);
      return { messages: next };
    }),

  contacts: [],
  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => set((s) => ({ contacts: [...s.contacts, contact] })),

  relayPool: null,
  setRelayPool: (pool) => set({ relayPool: pool }),

  callManager: null,
}));

// ── Hash-based route listener ──────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const parsed = parseHashRoute();
    useAppStore.setState({ route: parsed.route, routeParams: parsed.params });
  });
}

// Initialize theme on load
if (typeof document !== 'undefined') {
  const theme = useAppStore.getState().theme;
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}
