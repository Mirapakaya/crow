import { Suspense, lazy } from 'react';
import { useAppStore } from './Store';

const Onboarding = lazy(() => import('@ui/screens/Onboarding'));
const LockScreen = lazy(() => import('@ui/screens/LockScreen'));
const ChatList = lazy(() => import('@ui/screens/ChatList'));
const ChatView = lazy(() => import('@ui/screens/ChatView'));
// Lazy-loaded screens — wired up when routing is fully connected
// @ts-expect-error Used when settings routes are wired in
const Settings = lazy(() => import('@ui/screens/Settings'));
// @ts-expect-error Used when settings routes are wired in
const SecuritySettings = lazy(() => import('@ui/screens/SecuritySettings'));
// @ts-expect-error Used when settings routes are wired in
const RelaySettings = lazy(() => import('@ui/screens/RelaySettings'));

export function Router() {
  const vaultState = useAppStore((s) => s.vaultState);
  const hasIdentity = useAppStore((s) => s.hasIdentity);
  const activeConversationId = useAppStore((s) => s.activeConversationId);

  if (!hasIdentity) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Onboarding />
      </Suspense>
    );
  }

  if (vaultState !== 'unlocked') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LockScreen />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ChatRouter activeConversationId={activeConversationId} />
    </Suspense>
  );
}

function ChatRouter({ activeConversationId }: { activeConversationId: string | null }) {
  if (!activeConversationId) {
    return <ChatList />;
  }
  return <ChatView conversationId={activeConversationId} />;
}

function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}
