import { Layout, useTheme } from './Layout';
import { Router } from './Router';
import { useAppStore } from './Store';
import ConnectionBanner from '@ui/components/ConnectionBanner';

export function App() {
  useTheme();

  const vaultState = useAppStore((s) => s.vaultState);
  const hasIdentity = useAppStore((s) => s.hasIdentity);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const route = useAppStore((s) => s.route);

  // Before identity or vault unlock, show full-screen router
  if (!hasIdentity || vaultState !== 'unlocked') {
    return (
      <div className="screen">
        <Router />
      </div>
    );
  }

  // Settings-like screens: full screen (no sidebar)
  const fullScreenRoutes = new Set([
    '/addContact',
    '/contacts',
    '/groupCreate',
    '/backupRestore',
    '/deviceManagement',
    '/about',
    '/securitySettings',
    '/relaySettings',
  ]);
  if (fullScreenRoutes.has(route)) {
    return (
      <div className="screen">
        <ConnectionBanner />
        <Router />
      </div>
    );
  }

  // After unlock: split layout with sidebar + main
  return (
    <Layout
      sidebar={<ChatListRouter />}
      main={<MainRouter activeConversationId={activeConversationId} />}
    />
  );
}

function ChatListRouter() {
  return (
    <>
      <ConnectionBanner />
      <Router />
    </>
  );
}

function MainRouter({ activeConversationId }: { activeConversationId: string | null }) {
  if (activeConversationId) {
    return <Router />;
  }
  return <EmptyMain />;
}

function EmptyMain() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🐦</div>
      <div className="empty-state-title">Crow</div>
      <div className="empty-state-text">Select a conversation to start messaging</div>
    </div>
  );
}
