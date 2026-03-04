import React, { ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { usePage } from '@inertiajs/react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Header Navigation */}
      <AppHeader />
      
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}