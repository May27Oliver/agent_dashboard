import { useUIStore } from '@/store/uiStore';
import { useSocket } from '@/hooks/useSocket';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Dashboard } from '@/components/Layout/Dashboard';
import { SettingsPage } from '@/pages';

const App = () => {
  const { activeTab } = useUIStore();

  // Initialize socket connection
  useSocket();

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
};

export default App;
