import { useUIStore } from '@/store/uiStore';
import { SocketProvider } from '@/contexts/SocketContext';
import { useSocketEvents } from '@/hooks/useSocketEvents';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Dashboard } from '@/components/Layout/Dashboard';
import { SettingsPage } from '@/pages';

function AppContent() {
  const { activeTab } = useUIStore();

  // 初始化 socket 事件監聽（只執行一次）
  useSocketEvents();

  return (
    <MainLayout>
      <div className={activeTab === 'dashboard' ? 'contents' : 'hidden'}>
        <Dashboard />
      </div>
      <div className={activeTab === 'settings' ? 'contents' : 'hidden'}>
        <SettingsPage />
      </div>
    </MainLayout>
  );
}

const App = () => (
  <SocketProvider>
    <AppContent />
  </SocketProvider>
);

export default App;
