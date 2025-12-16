'use client';

/**
 * MCP 도구 활성화/비활성화 토글 컴포넌트
 */

import { Wrench, Zap } from 'lucide-react';
import { useMcp } from '@/lib/mcp/context';

interface McpToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function McpToggle({ enabled, onToggle }: McpToggleProps) {
  const { serverStates } = useMcp();

  // 연결된 서버 수 계산
  const connectedCount = Array.from(serverStates.values()).filter(
    (s) => s.status === 'connected'
  ).length;

  // 연결된 서버의 총 도구 수 계산
  const totalTools = Array.from(serverStates.values())
    .filter((s) => s.status === 'connected')
    .reduce((sum, s) => sum + (s.tools?.length || 0), 0);

  const hasConnectedServers = connectedCount > 0;

  return (
    <button
      onClick={() => hasConnectedServers && onToggle(!enabled)}
      disabled={!hasConnectedServers}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
        ${enabled && hasConnectedServers
          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 ring-2 ring-purple-500/20'
          : hasConnectedServers
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
        }
      `}
      title={
        !hasConnectedServers
          ? 'MCP 서버가 연결되어 있지 않습니다'
          : enabled
            ? 'MCP 도구 비활성화'
            : 'MCP 도구 활성화'
      }
    >
      {enabled && hasConnectedServers ? (
        <Zap className="w-3.5 h-3.5" />
      ) : (
        <Wrench className="w-3.5 h-3.5" />
      )}
      <span>
        {hasConnectedServers
          ? enabled
            ? `도구 ${totalTools}개 활성`
            : `도구 ${totalTools}개`
          : '도구 없음'
        }
      </span>
    </button>
  );
}

