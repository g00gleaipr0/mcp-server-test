'use client';

/**
 * MCP 도구 패널 컴포넌트
 * 채팅창 상단에 연결된 MCP 서버와 사용 가능한 도구 목록을 표시합니다.
 */

import { useState, useEffect } from 'react';
import {
  Wrench,
  ChevronDown,
  ChevronUp,
  Server,
  CheckCircle,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useMcp } from '@/lib/mcp/context';
import type { McpTool } from '@/lib/mcp/types';
import Link from 'next/link';

interface McpToolsPanelProps {
  enabled: boolean;
}

export function McpToolsPanel({ enabled }: McpToolsPanelProps) {
  const { servers, serverStates, refreshServers } = useMcp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 연결된 서버 정보 계산
  const connectedServers = servers.filter((s) => {
    const status = serverStates.get(s.id);
    return status?.status === 'connected';
  });

  const totalTools = connectedServers.reduce((count, server) => {
    const status = serverStates.get(server.id);
    return count + (status?.tools?.length || 0);
  }, 0);

  const connectedCount = connectedServers.length;

  // 활성화되지 않았거나 연결된 서버가 없으면 표시 안함
  if (!enabled) {
    return null;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshServers();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
      {/* MCP 도구 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            MCP 도구
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {totalTools}개 사용 가능
          </span>
        </div>

        <div className="flex items-center gap-2">
          {connectedCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              {connectedCount}개 활성화
            </span>
          )}
          <Link
            href="/mcp"
            onClick={(e) => e.stopPropagation()}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded transition-colors"
            title="MCP 설정"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
          </Link>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* 서버 및 도구 목록 */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-3">
          {connectedServers.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 py-2">
              연결된 MCP 서버가 없습니다.{' '}
              <Link href="/mcp" className="text-blue-500 hover:underline">
                서버 연결하기
              </Link>
            </div>
          ) : (
            connectedServers.map((server) => {
              const status = serverStates.get(server.id);
              const tools: McpTool[] = status?.tools || [];

              return (
                <div
                  key={server.id}
                  className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                >
                  {/* 서버 헤더 */}
                  <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-750 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                        <Server className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {server.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {tools.length}개 도구
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      활성화됨
                    </span>
                  </div>

                  {/* 도구 목록 */}
                  {tools.length > 0 && (
                    <div className="px-3 py-2">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                        사용 가능한 도구
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tools.map((tool) => (
                          <span
                            key={tool.name}
                            className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                            title={tool.description}
                          >
                            {tool.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* MCP 디버그 정보 */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button
              onClick={() => setIsDebugExpanded(!isDebugExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  ⚙️ MCP 디버그 정보
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {connectedCount}/{servers.length} 연결됨
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                  title="새로고침"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </button>
                {isDebugExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </div>
            </button>

            {isDebugExpanded && (
              <div className="px-3 pb-2 text-xs font-mono space-y-1 border-t border-zinc-200 dark:border-zinc-700 pt-2">
                {servers.map((server) => {
                  const status = serverStates.get(server.id);
                  const isServerConnected = status?.status === 'connected';

                  return (
                    <div key={server.id} className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isServerConnected ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
                      />
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {server.name}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500">
                        ({server.type})
                      </span>
                      {status?.error && (
                        <span className="text-red-500 text-[10px]">
                          {status.error}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

