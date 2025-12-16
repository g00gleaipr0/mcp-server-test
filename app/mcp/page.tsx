'use client';

/**
 * MCP 서버 관리 페이지
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Server,
  Download,
  Upload,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useMcp } from '@/lib/mcp/context';
import { McpServerCard } from '@/app/components/mcp-server-card';
import { McpServerForm } from '@/app/components/mcp-server-form';
import { McpTestPanel } from '@/app/components/mcp-test-panel';
import { sessionManager } from '@/lib/session';
import type { McpServerConfig } from '@/lib/mcp/types';

function McpPageContent() {
  const router = useRouter();
  const {
    servers,
    serverStates,
    isLoading,
    error,
    addServer,
    updateServer,
    deleteServer,
    connect,
    disconnect,
    exportServers,
    importServers,
    refreshServers,
  } = useMcp();

  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null);
  const [testingServer, setTestingServer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 세션 확인
  useEffect(() => {
    setIsMounted(true);
    if (!sessionManager.isAuthenticated()) {
      router.push('/login');
      return;
    }
    sessionManager.extendSession();
  }, [router]);

  // 서버 추가/수정 제출
  const handleSubmit = (data: Omit<McpServerConfig, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (data.id) {
      // 수정
      updateServer({
        ...data,
        id: data.id,
        createdAt: editingServer?.createdAt || Date.now(),
        updatedAt: Date.now(),
      } as McpServerConfig);
    } else {
      // 추가
      addServer(data);
    }
    setShowForm(false);
    setEditingServer(null);
  };

  // 서버 삭제
  const handleDelete = async (serverId: string) => {
    if (!window.confirm('이 서버를 삭제하시겠습니까?')) return;
    await deleteServer(serverId);
  };

  // 설정 내보내기
  const handleExport = () => {
    const json = exportServers();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-servers-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 설정 가져오기
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const count = importServers(json, true);
        setImportError(null);
        alert(`${count}개의 서버 설정을 가져왔습니다.`);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : '가져오기 실패');
      }
    };
    reader.readAsText(file);

    // 파일 입력 초기화
    e.target.value = '';
  };

  // 테스트 패널 열기
  const handleTest = (server: McpServerConfig) => {
    setTestingServer({ id: server.id, name: server.name });
  };

  if (!isMounted) {
    return null;
  }

  const connectedCount = Array.from(serverStates.values()).filter(
    (s) => s.status === 'connected'
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
                  <Server className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">MCP 서버 관리</h1>
                  <p className="text-sm text-zinc-500">
                    {servers.length}개 서버 · {connectedCount}개 연결됨
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshServers}
                className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="새로고침"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleExport}
                disabled={servers.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                내보내기
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                가져오기
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => {
                  setEditingServer(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                서버 추가
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 오류 메시지 */}
        {(error || importError) && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-700 dark:text-red-400">오류 발생</h3>
              <p className="text-sm text-red-600 dark:text-red-400/80">
                {error || importError}
              </p>
            </div>
          </div>
        )}

        {/* 서버 목록 */}
        {servers.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full w-fit mx-auto mb-4">
              <Server className="w-12 h-12 text-zinc-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              등록된 MCP 서버가 없습니다
            </h2>
            <p className="text-zinc-500 mb-6">
              서버를 추가하여 MCP 기능을 사용해보세요
            </p>
            <button
              onClick={() => {
                setEditingServer(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              첫 번째 서버 추가
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {servers.map((server) => (
              <McpServerCard
                key={server.id}
                config={server}
                state={serverStates.get(server.id)}
                isLoading={isLoading}
                onConnect={() => connect(server.id)}
                onDisconnect={() => disconnect(server.id)}
                onEdit={() => {
                  setEditingServer(server);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(server.id)}
                onTest={() => handleTest(server)}
              />
            ))}
          </div>
        )}

        {/* 도움말 */}
        <div className="mt-12 p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            MCP 서버 연결 방법
          </h3>
          <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <h4 className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                STDIO (로컬 프로세스)
              </h4>
              <p>
                로컬에서 실행되는 MCP 서버와 표준 입출력(stdin/stdout)으로 통신합니다.
                Node.js, Python 등으로 작성된 로컬 MCP 서버에 적합합니다.
              </p>
              <code className="block mt-2 p-2 bg-zinc-100 dark:bg-zinc-900 rounded text-xs">
                명령어: npx, 인자: -y @modelcontextprotocol/server-filesystem /path
              </code>
            </div>
            <div>
              <h4 className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Streamable HTTP (원격 서버)
              </h4>
              <p>
                HTTP를 통해 원격 MCP 서버와 통신합니다.
                클라우드나 다른 머신에서 실행되는 MCP 서버에 적합합니다.
              </p>
              <code className="block mt-2 p-2 bg-zinc-100 dark:bg-zinc-900 rounded text-xs">
                URL: http://localhost:3001/mcp
              </code>
            </div>
          </div>
        </div>
      </main>

      {/* 서버 추가/수정 모달 */}
      {showForm && (
        <McpServerForm
          initialData={editingServer || undefined}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingServer(null);
          }}
        />
      )}

      {/* 테스트 패널 */}
      {testingServer && serverStates.get(testingServer.id) && (
        <McpTestPanel
          serverId={testingServer.id}
          serverName={testingServer.name}
          state={serverStates.get(testingServer.id)!}
          onClose={() => setTestingServer(null)}
        />
      )}
    </div>
  );
}

export default function McpPage() {
  return <McpPageContent />;
}

