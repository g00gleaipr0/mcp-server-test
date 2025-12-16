'use client';

/**
 * MCP 연결 상태 뱃지 컴포넌트
 * 헤더에 표시되어 현재 MCP 서버 연결 상태를 보여줍니다.
 */

import { useRouter } from 'next/navigation';
import { Server, Plug, AlertCircle } from 'lucide-react';
import { useMcp } from '@/lib/mcp/context';

export function McpStatusBadge() {
  const router = useRouter();
  const { servers, serverStates } = useMcp();

  // 연결된 서버 수 계산
  const connectedCount = Array.from(serverStates.values()).filter(
    (s) => s.status === 'connected'
  ).length;

  // 오류 있는 서버 수 계산
  const errorCount = Array.from(serverStates.values()).filter(
    (s) => s.status === 'error'
  ).length;

  const totalServers = servers.length;

  // 상태에 따른 스타일
  let bgColor = 'bg-zinc-100 dark:bg-zinc-800';
  let textColor = 'text-zinc-500';
  let icon = <Server className="w-4 h-4" />;

  if (connectedCount > 0) {
    bgColor = 'bg-green-100 dark:bg-green-900/30';
    textColor = 'text-green-600 dark:text-green-400';
    icon = <Plug className="w-4 h-4" />;
  } else if (errorCount > 0) {
    bgColor = 'bg-red-100 dark:bg-red-900/30';
    textColor = 'text-red-600 dark:text-red-400';
    icon = <AlertCircle className="w-4 h-4" />;
  }

  return (
    <button
      onClick={() => router.push('/mcp')}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor} ${textColor} hover:opacity-80 transition-opacity`}
      title="MCP 서버 관리"
    >
      {icon}
      <span className="text-xs font-medium">
        {connectedCount > 0 ? (
          <>MCP {connectedCount}/{totalServers}</>
        ) : totalServers > 0 ? (
          <>MCP {totalServers}개</>
        ) : (
          <>MCP 설정</>
        )}
      </span>
    </button>
  );
}

