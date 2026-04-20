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
      {/* min-h-0 让子页面 flex 列可收缩，避免内部 overflow:hidden 时裁切底部且无法滚动 */}
      <SidebarInset className="min-h-0">
        {children}
      </SidebarInset>
    </>
  );
}
