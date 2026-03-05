'use client';

import { Suspense, lazy, memo } from 'react';
import { cn } from '@/lib/utils';

// Lazy load the ChatBox component
const ChatBox = lazy(() => import('./chatbox'));

interface AsyncSidebarProps {
  isSidebarCollapsed: boolean;
  onAddMermaidToCanvas?: (mermaidCode: string) => void;
  className?: string;
}

// Loading component for the sidebar
const SidebarLoader = memo(() => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
      <div className="text-sm text-gray-600">Loading chat...</div>
    </div>
  </div>
));

SidebarLoader.displayName = 'SidebarLoader';

// Memoized sidebar component
export const AsyncSidebar = memo(({ 
  isSidebarCollapsed, 
  onAddMermaidToCanvas, 
  className 
}: AsyncSidebarProps) => {
  return (
    <aside
      className={cn(
        'pointer-events-none absolute top-16 bottom-0 right-0 z-40 flex w-full max-w-[420px] translate-x-0 transform-gpu transition-transform duration-300 ease-out',
        isSidebarCollapsed ? 'translate-x-full' : 'translate-x-0',
        className
      )}
    >
      <div className="pointer-events-auto flex h-full w-full items-stretch bg-gradient-to-l from-white/80 via-white/55 to-transparent p-4">
        <Suspense fallback={<SidebarLoader />}>
          <ChatBox
            hidden={isSidebarCollapsed}
            className="h-full w-full"
            onAddMermaidToCanvas={onAddMermaidToCanvas}
          />
        </Suspense>
      </div>
    </aside>
  );
});

AsyncSidebar.displayName = 'AsyncSidebar';
