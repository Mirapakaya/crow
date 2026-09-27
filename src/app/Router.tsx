import { Suspense, lazy } from 'react';
import { useAppStore } from './Store';

const Onboarding = lazy(() => import('@ui/screens/Onboarding'));
const LockScreen = lazy(() => import('@ui/screens/LockScreen'));
const ChatList = lazy(() => import('@ui/screens/ChatList'));
const ChatView = lazy(() => import('@ui/screens/ChatView'));
const Settings = lazy(() => import('@ui/screens/Settings'));
const SecuritySettings = lazy(() => import('@ui/screens/SecuritySettings'));
const RelaySettings = lazy(() => import('@ui/screens/RelaySettings'));
const AddContact = lazy(() => import('@ui/screens/AddContact'));
const Contacts = lazy(() => import('@ui/screens/Contacts'));
const GroupCreate = lazy(() => import('@ui/screens/GroupCreate'));
const BackupRestore = lazy(() => import('@ui/screens/BackupRestore'));
const DeviceManagement = lazy(() => import('@ui/screens/DeviceManagement'));
const CallScreen = lazy(() => import('@ui/screens/CallScreen'));
const About = lazy(() => import('@ui/screens/About'));

export function Router() {
  const vaultState = useAppStore((s) => s.vaultState);
  const hasIdentity = useAppStore((s) => s.hasIdentity);
  const route = useAppStore((s) => s.route);
  const routeParams = useAppStore((s) => s.routeParams);

  // Before identity exists → Onboarding
  if (!hasIdentity) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Onboarding />
      </Suspense>
    );
  }

  // Vault locked → LockScreen
  if (vaultState !== 'unlocked') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LockScreen />
      </Suspense>
    );
  }

  // Unlocked → route-based rendering
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RouteSwitch route={route} routeParams={routeParams} />
    </Suspense>
  );
}

function RouteSwitch({
  route,
  routeParams,
}: {
  route: string;
  routeParams: Record<string, string>;
}) {
  switch (route) {
    case '/settings':
      return <Settings />;
    case '/securitySettings':
      return <SecuritySettings />;
    case '/relaySettings':
      return <RelaySettings />;
    case '/addContact':
      return <AddContact />;
    case '/contacts':
      return <Contacts />;
    case '/groupCreate':
      return <GroupCreate />;
    case '/backupRestore':
      return <BackupRestore />;
    case '/deviceManagement':
      return <DeviceManagement />;
    case '/callScreen':
      return (
        <CallScreen
          callState="ringing"
          kind="incoming"
          peerName={routeParams.peerName ?? ''}
          onEnd={() => {}}
        />
      );
    case '/about':
      return <About />;
    case '/chatView':
      return <ChatView conversationId={routeParams.id ?? ''} />;
    case '/':
    default:
      return <ChatList />;
  }
}

function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}
