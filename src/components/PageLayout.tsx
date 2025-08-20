import React from 'react';
import { AppSidebar } from './AppSidebar';
import { SidebarInset } from '@/components/ui/sidebar';

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </>
  );
}
