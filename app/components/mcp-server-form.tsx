'use client';

/**
 * MCP 서버 추가/수정 폼 모달
 */

import { useState, useEffect } from 'react';
import { X, Terminal, Globe, Plus, Trash2 } from 'lucide-react';
import type { McpServerConfig, McpTransportType } from '@/lib/mcp/types';

interface McpServerFormProps {
  initialData?: McpServerConfig;
  onSubmit: (data: Omit<McpServerConfig, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
}

export function McpServerForm({ initialData, onSubmit, onClose }: McpServerFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<McpTransportType>(initialData?.type || 'stdio');
  
  // STDIO 필드
  const [command, setCommand] = useState(initialData?.command || '');
  const [args, setArgs] = useState<string[]>(initialData?.args || []);
  const [envEntries, setEnvEntries] = useState<Array<{ key: string; value: string }>>(
    initialData?.env
      ? Object.entries(initialData.env).map(([key, value]) => ({ key, value }))
      : []
  );

  // HTTP 필드
  const [url, setUrl] = useState(initialData?.url || '');
  const [headerEntries, setHeaderEntries] = useState<Array<{ key: string; value: string }>>(
    initialData?.headers
      ? Object.entries(initialData.headers).map(([key, value]) => ({ key, value }))
      : []
  );

  const [argsInput, setArgsInput] = useState(initialData?.args?.join(' ') || '');

  // args 입력 동기화
  useEffect(() => {
    const parsed = argsInput.split(' ').filter((a) => a.trim() !== '');
    setArgs(parsed);
  }, [argsInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 환경변수 객체로 변환
    const env: Record<string, string> = {};
    for (const entry of envEntries) {
      if (entry.key.trim()) {
        env[entry.key.trim()] = entry.value;
      }
    }

    // 헤더 객체로 변환
    const headers: Record<string, string> = {};
    for (const entry of headerEntries) {
      if (entry.key.trim()) {
        headers[entry.key.trim()] = entry.value;
      }
    }

    onSubmit({
      id: initialData?.id,
      name,
      type,
      command: type === 'stdio' ? command : undefined,
      args: type === 'stdio' && args.length > 0 ? args : undefined,
      env: type === 'stdio' && Object.keys(env).length > 0 ? env : undefined,
      url: type === 'streamable-http' ? url : undefined,
      headers: type === 'streamable-http' && Object.keys(headers).length > 0 ? headers : undefined,
    });
  };

  const addEnvEntry = () => {
    setEnvEntries([...envEntries, { key: '', value: '' }]);
  };

  const removeEnvEntry = (index: number) => {
    setEnvEntries(envEntries.filter((_, i) => i !== index));
  };

  const updateEnvEntry = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envEntries];
    updated[index][field] = value;
    setEnvEntries(updated);
  };

  const addHeaderEntry = () => {
    setHeaderEntries([...headerEntries, { key: '', value: '' }]);
  };

  const removeHeaderEntry = (index: number) => {
    setHeaderEntries(headerEntries.filter((_, i) => i !== index));
  };

  const updateHeaderEntry = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...headerEntries];
    updated[index][field] = value;
    setHeaderEntries(updated);
  };

  const isValid = name.trim() && (
    (type === 'stdio' && command.trim()) ||
    (type === 'streamable-http' && url.trim())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {initialData ? 'MCP 서버 수정' : 'MCP 서버 추가'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              서버 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: My MCP Server"
              className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              연결 방식 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('stdio')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  type === 'stdio'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  type === 'stdio'
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}>
                  <Terminal className={`w-5 h-5 ${
                    type === 'stdio'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-zinc-500'
                  }`} />
                </div>
                <div className="text-left">
                  <div className={`font-medium ${
                    type === 'stdio'
                      ? 'text-purple-700 dark:text-purple-400'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    STDIO
                  </div>
                  <div className="text-xs text-zinc-500">로컬 프로세스</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('streamable-http')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  type === 'streamable-http'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  type === 'streamable-http'
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}>
                  <Globe className={`w-5 h-5 ${
                    type === 'streamable-http'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-zinc-500'
                  }`} />
                </div>
                <div className="text-left">
                  <div className={`font-medium ${
                    type === 'streamable-http'
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    Streamable HTTP
                  </div>
                  <div className="text-xs text-zinc-500">원격 서버</div>
                </div>
              </button>
            </div>
          </div>

          {/* STDIO 필드 */}
          {type === 'stdio' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  명령어 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="예: node, npx, python"
                  className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  인자 (Args)
                </label>
                <input
                  type="text"
                  value={argsInput}
                  onChange={(e) => setArgsInput(e.target.value)}
                  placeholder="예: server.js --port 3000"
                  className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm"
                />
                <p className="text-xs text-zinc-500 mt-1">공백으로 구분</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    환경 변수
                  </label>
                  <button
                    type="button"
                    onClick={addEnvEntry}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    추가
                  </button>
                </div>
                {envEntries.length > 0 ? (
                  <div className="space-y-2">
                    {envEntries.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={entry.key}
                          onChange={(e) => updateEnvEntry(index, 'key', e.target.value)}
                          placeholder="KEY"
                          className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                        <span className="text-zinc-400">=</span>
                        <input
                          type="text"
                          value={entry.value}
                          onChange={(e) => updateEnvEntry(index, 'value', e.target.value)}
                          placeholder="value"
                          className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeEnvEntry(index)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">환경 변수가 없습니다</p>
                )}
              </div>
            </>
          )}

          {/* HTTP 필드 */}
          {type === 'streamable-http' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  서버 URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="예: http://localhost:3000/mcp"
                  className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    HTTP 헤더
                  </label>
                  <button
                    type="button"
                    onClick={addHeaderEntry}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    추가
                  </button>
                </div>
                {headerEntries.length > 0 ? (
                  <div className="space-y-2">
                    {headerEntries.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={entry.key}
                          onChange={(e) => updateHeaderEntry(index, 'key', e.target.value)}
                          placeholder="Header-Name"
                          className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                        <span className="text-zinc-400">:</span>
                        <input
                          type="text"
                          value={entry.value}
                          onChange={(e) => updateHeaderEntry(index, 'value', e.target.value)}
                          placeholder="value"
                          className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeHeaderEntry(index)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">추가 헤더가 없습니다</p>
                )}
              </div>
            </>
          )}

          {/* 경고 메시지 */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              ⚠️ 민감한 정보(API 키 등)는 환경 변수(.env.local)에 저장하는 것을 권장합니다.
              localStorage에 저장된 데이터는 브라우저에서 접근 가능합니다.
            </p>
          </div>
        </form>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initialData ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

