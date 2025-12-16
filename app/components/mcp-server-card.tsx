'use client';

/**
 * MCP 서버 카드 컴포넌트
 * 개별 MCP 서버의 정보와 연결 상태를 표시합니다.
 */

import {
  Plug,
  PlugZap,
  Trash2,
  Edit2,
  Terminal,
  Globe,
  Loader2,
  AlertCircle,
  Wrench,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import type { McpServerConfig, McpServerState } from '@/lib/mcp/types';

interface McpServerCardProps {
  config: McpServerConfig;
  state?: McpServerState;
  isLoading?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
}

export function McpServerCard({
  config,
  state,
  isLoading,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  onTest,
}: McpServerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const status = state?.status || 'disconnected';
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const hasError = status === 'error';

  // 상태별 스타일
  const statusColors = {
    disconnected: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    connecting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    connected: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusLabels = {
    disconnected: '연결 안됨',
    connecting: '연결 중...',
    connected: '연결됨',
    error: '오류',
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* 타입 아이콘 */}
            <div className={`p-2 rounded-lg ${
              config.type === 'stdio'
                ? 'bg-purple-100 dark:bg-purple-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              {config.type === 'stdio' ? (
                <Terminal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              ) : (
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {config.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {config.type === 'stdio' ? config.command : config.url}
              </p>
            </div>
          </div>

          {/* 상태 뱃지 */}
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* 오류 메시지 */}
        {hasError && state?.error && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
          </div>
        )}

        {/* 연결됨 상태일 때 capabilities 표시 */}
        {isConnected && state && (
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5" />
              <span>{state.tools?.length || 0} Tools</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{state.prompts?.length || 0} Prompts</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>{state.resources?.length || 0} Resources</span>
            </div>
          </div>
        )}
      </div>

      {/* 확장 영역 - 상세 설정 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">타입:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {config.type}
              </span>
            </div>
            {config.type === 'stdio' && (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500">명령어:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[60%]">
                    {config.command}
                  </span>
                </div>
                {config.args && config.args.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">인자:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[60%]">
                      {config.args.join(' ')}
                    </span>
                  </div>
                )}
              </>
            )}
            {config.type === 'streamable-http' && (
              <div className="flex justify-between">
                <span className="text-zinc-500">URL:</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[60%]">
                  {config.url}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">생성일:</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {new Date(config.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 영역 */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* 확장/축소 버튼 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title={isExpanded ? '접기' : '상세 보기'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* 수정 버튼 */}
          <button
            onClick={onEdit}
            disabled={isConnected || isConnecting}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="수정"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* 삭제 버튼 */}
          <button
            onClick={onDelete}
            disabled={isConnected || isConnecting}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 테스트 버튼 (연결됨 상태에서만) */}
          {isConnected && (
            <button
              onClick={onTest}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              테스트
            </button>
          )}

          {/* 연결/연결 해제 버튼 */}
          {isConnected ? (
            <button
              onClick={onDisconnect}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <PlugZap className="w-4 h-4" />
              연결 해제
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isLoading || isConnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plug className="w-4 h-4" />
              )}
              {isConnecting ? '연결 중...' : '연결'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

