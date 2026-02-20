import type { ReactNode } from 'react';
import { TopNavigation } from '@/components/Navigation';
import { EventLogPanel } from '@/components/EventLog';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Top Navigation */}
      <TopNavigation />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Bottom Event Log */}
      <EventLogPanel maxHeight="150px" />
    </div>
  );
}
