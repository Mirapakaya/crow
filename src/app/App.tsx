import { Layout, useTheme } from './Layout';
import { Router } from './Router';
import { useAppStore } from './Store';

export function App() {
  useTheme();

  const vaultState = useAppStore((s) => s.vaultState);
  const hasIdentity = useAppStore((s) => s.hasIdentity);

  // Before identity or vault unlock, show full-screen router
  if (!hasIdentity || vaultState !== 'unlocked') {
    return (
      <div className="screen">
        <Router />
      </div>
    );
  }

  // After unlock, show split layout
  return (
    <Layout
      sidebar={<Router />}
      main={
        useAppStore.getState().activeConversationId ? (
          <Router />
        ) : (
          <EmptyMain />
        )
      }
    />
  );
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
