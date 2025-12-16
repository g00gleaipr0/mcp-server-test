'use client';

/**
 * 함수 호출 카드 컴포넌트
 * 채팅창에서 MCP 함수 호출 과정과 결과를 시각적으로 표시합니다.
 */

import { useState } from 'react';
import {
  Wrench,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { FunctionCall } from '@/lib/types';

interface FunctionCallCardProps {
  functionCall: FunctionCall;
}

export function FunctionCallCard({ functionCall }: FunctionCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { name, arguments: args, result, status, error } = functionCall;

  // 상태별 스타일
  const statusConfig = {
    pending: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-400',
      label: '대기 중',
    },
    running: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-400',
      label: '실행 중',
    },
    success: {
      icon: <CheckCircle className="w-4 h-4" />,
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-400',
      label: '완료',
    },
    error: {
      icon: <XCircle className="w-4 h-4" />,
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
      label: '오류',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`rounded-lg border ${config.bg} ${config.border} overflow-hidden my-2`}>
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className={`p-1.5 rounded-md ${config.bg}`}>
          <Wrench className={`w-4 h-4 ${config.text}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {name}
            </span>
            <span className={`flex items-center gap-1 text-xs ${config.text}`}>
              {config.icon}
              {config.label}
            </span>
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {/* 상세 내용 */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* 입력 인자 */}
          {Object.keys(args).length > 0 && (
            <div>
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                입력
              </div>
              <pre className="text-xs bg-white dark:bg-zinc-900 rounded p-2 overflow-x-auto border border-zinc-200 dark:border-zinc-700">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div>
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                결과
              </div>
              <pre className="text-xs bg-white dark:bg-zinc-900 rounded p-2 overflow-x-auto border border-zinc-200 dark:border-zinc-700 max-h-40">
                {result}
              </pre>
            </div>
          )}

          {/* 오류 */}
          {error && (
            <div>
              <div className="text-xs font-medium text-red-500 mb-1">
                오류
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded p-2">
                {error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 여러 함수 호출을 표시하는 컴포넌트
 */
interface FunctionCallsDisplayProps {
  functionCalls: FunctionCall[];
}

export function FunctionCallsDisplay({ functionCalls }: FunctionCallsDisplayProps) {
  if (!functionCalls || functionCalls.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Wrench className="w-3.5 h-3.5" />
        <span>도구 호출 ({functionCalls.length}개)</span>
      </div>
      {functionCalls.map((fc) => (
        <FunctionCallCard key={fc.id} functionCall={fc} />
      ))}
    </div>
  );
}

