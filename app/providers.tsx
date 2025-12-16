'use client';

/**
 * 앱 전체 Provider 컴포넌트
 */

import { ReactNode } from 'react';
import { McpProvider } from '@/lib/mcp/context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <McpProvider>
      {children}
    </McpProvider>
  );
}

