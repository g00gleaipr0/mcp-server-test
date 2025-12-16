'use client';

/**
 * MCP 테스트 패널 컴포넌트
 * MCP 서버의 Tools, Prompts, Resources를 테스트합니다.
 */

import { useState } from 'react';
import {
  X,
  Play,
  Loader2,
  Wrench,
  MessageSquare,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useMcp } from '@/lib/mcp/context';
import type {
  McpServerState,
  McpTool,
  McpPrompt,
  McpResource,
  McpExecuteResult,
} from '@/lib/mcp/types';

interface McpTestPanelProps {
  serverId: string;
  serverName: string;
  state: McpServerState;
  onClose: () => void;
}

type TabType = 'tools' | 'prompts' | 'resources';

export function McpTestPanel({
  serverId,
  serverName,
  state,
  onClose,
}: McpTestPanelProps) {
  const { execute, isLoading } = useMcp();
  const [activeTab, setActiveTab] = useState<TabType>('tools');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<McpExecuteResult | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const tools = state.tools || [];
  const prompts = state.prompts || [];
  const resources = state.resources || [];

  // 탭 데이터
  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" />, count: tools.length },
    { id: 'prompts', label: 'Prompts', icon: <MessageSquare className="w-4 h-4" />, count: prompts.length },
    { id: 'resources', label: 'Resources', icon: <FileText className="w-4 h-4" />, count: resources.length },
  ];

  // 선택된 Tool 찾기
  const selectedTool = tools.find((t) => t.name === selectedItem);
  const selectedPrompt = prompts.find((p) => p.name === selectedItem);
  const selectedResource = resources.find((r) => r.uri === selectedItem);

  // Tool 실행
  const handleExecuteTool = async (tool: McpTool) => {
    setLocalLoading(true);
    setResult(null);

    // inputSchema에서 arguments 파싱
    const toolArgs: Record<string, unknown> = {};
    if (tool.inputSchema && typeof tool.inputSchema === 'object') {
      const properties = (tool.inputSchema as { properties?: Record<string, unknown> }).properties || {};
      for (const key of Object.keys(properties)) {
        if (args[key] !== undefined && args[key] !== '') {
          // JSON 파싱 시도
          try {
            toolArgs[key] = JSON.parse(args[key]);
          } catch {
            toolArgs[key] = args[key];
          }
        }
      }
    }

    const execResult = await execute({
      type: 'tool',
      serverId,
      name: tool.name,
      arguments: toolArgs,
    });

    setResult(execResult);
    setLocalLoading(false);
  };

  // Prompt 조회
  const handleGetPrompt = async (prompt: McpPrompt) => {
    setLocalLoading(true);
    setResult(null);

    const promptArgs: Record<string, string> = {};
    if (prompt.arguments) {
      for (const arg of prompt.arguments) {
        if (args[arg.name]) {
          promptArgs[arg.name] = args[arg.name];
        }
      }
    }

    const execResult = await execute({
      type: 'prompt',
      serverId,
      name: prompt.name,
      arguments: promptArgs,
    });

    setResult(execResult);
    setLocalLoading(false);
  };

  // Resource 읽기
  const handleReadResource = async (resource: McpResource) => {
    setLocalLoading(true);
    setResult(null);

    const execResult = await execute({
      type: 'resource',
      serverId,
      uri: resource.uri,
    });

    setResult(execResult);
    setLocalLoading(false);
  };

  // 아이템 선택
  const handleSelectItem = (item: string) => {
    setSelectedItem(item);
    setArgs({});
    setResult(null);
  };

  // Input Schema에서 필드 추출
  const getInputFields = (schema: Record<string, unknown> | undefined) => {
    if (!schema || typeof schema !== 'object') return [];
    const properties = (schema as { properties?: Record<string, { type?: string; description?: string }> }).properties || {};
    const required = (schema as { required?: string[] }).required || [];
    
    return Object.entries(properties).map(([name, prop]) => ({
      name,
      type: prop.type || 'string',
      description: prop.description,
      required: required.includes(name),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              MCP 테스트 - {serverName}
            </h2>
            <p className="text-sm text-zinc-500">서버의 기능을 테스트합니다</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedItem(null);
                setResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽: 목록 */}
          <div className="w-1/3 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
            {activeTab === 'tools' && (
              <div className="p-2">
                {tools.length === 0 ? (
                  <p className="p-4 text-sm text-zinc-500 text-center">등록된 Tool이 없습니다</p>
                ) : (
                  tools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => handleSelectItem(tool.name)}
                      className={`w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                        selectedItem === tool.name
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Wrench className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{tool.name}</div>
                        {tool.description && (
                          <div className="text-xs text-zinc-500 truncate">{tool.description}</div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-50" />
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === 'prompts' && (
              <div className="p-2">
                {prompts.length === 0 ? (
                  <p className="p-4 text-sm text-zinc-500 text-center">등록된 Prompt가 없습니다</p>
                ) : (
                  prompts.map((prompt) => (
                    <button
                      key={prompt.name}
                      onClick={() => handleSelectItem(prompt.name)}
                      className={`w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                        selectedItem === prompt.name
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{prompt.name}</div>
                        {prompt.description && (
                          <div className="text-xs text-zinc-500 truncate">{prompt.description}</div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-50" />
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="p-2">
                {resources.length === 0 ? (
                  <p className="p-4 text-sm text-zinc-500 text-center">등록된 Resource가 없습니다</p>
                ) : (
                  resources.map((resource) => (
                    <button
                      key={resource.uri}
                      onClick={() => handleSelectItem(resource.uri)}
                      className={`w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                        selectedItem === resource.uri
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{resource.name}</div>
                        <div className="text-xs text-zinc-500 truncate">{resource.uri}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-50" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 오른쪽: 상세 및 실행 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedItem ? (
              <div className="flex-1 flex items-center justify-center text-zinc-400">
                <p>왼쪽에서 항목을 선택하세요</p>
              </div>
            ) : (
              <>
                {/* 상세 정보 및 입력 */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 overflow-y-auto">
                  {/* Tool 상세 */}
                  {activeTab === 'tools' && selectedTool && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {selectedTool.name}
                        </h3>
                        {selectedTool.description && (
                          <p className="text-sm text-zinc-500 mt-1">{selectedTool.description}</p>
                        )}
                      </div>

                      {/* 입력 필드 */}
                      {selectedTool.inputSchema && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            입력 파라미터
                          </h4>
                          {getInputFields(selectedTool.inputSchema).map((field) => (
                            <div key={field.name}>
                              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                                {field.name}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                <span className="text-xs text-zinc-400 ml-2">({field.type})</span>
                              </label>
                              <input
                                type="text"
                                value={args[field.name] || ''}
                                onChange={(e) => setArgs({ ...args, [field.name]: e.target.value })}
                                placeholder={field.description || `${field.name} 입력`}
                                className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleExecuteTool(selectedTool)}
                        disabled={localLoading || isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {localLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        실행
                      </button>
                    </div>
                  )}

                  {/* Prompt 상세 */}
                  {activeTab === 'prompts' && selectedPrompt && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {selectedPrompt.name}
                        </h3>
                        {selectedPrompt.description && (
                          <p className="text-sm text-zinc-500 mt-1">{selectedPrompt.description}</p>
                        )}
                      </div>

                      {/* 입력 필드 */}
                      {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            입력 파라미터
                          </h4>
                          {selectedPrompt.arguments.map((arg) => (
                            <div key={arg.name}>
                              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                                {arg.name}
                                {arg.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <input
                                type="text"
                                value={args[arg.name] || ''}
                                onChange={(e) => setArgs({ ...args, [arg.name]: e.target.value })}
                                placeholder={arg.description || `${arg.name} 입력`}
                                className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleGetPrompt(selectedPrompt)}
                        disabled={localLoading || isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {localLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        조회
                      </button>
                    </div>
                  )}

                  {/* Resource 상세 */}
                  {activeTab === 'resources' && selectedResource && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {selectedResource.name}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1 font-mono">{selectedResource.uri}</p>
                        {selectedResource.description && (
                          <p className="text-sm text-zinc-500 mt-1">{selectedResource.description}</p>
                        )}
                        {selectedResource.mimeType && (
                          <p className="text-xs text-zinc-400 mt-1">MIME: {selectedResource.mimeType}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleReadResource(selectedResource)}
                        disabled={localLoading || isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {localLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        읽기
                      </button>
                    </div>
                  )}
                </div>

                {/* 결과 영역 */}
                <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    실행 결과
                  </h4>
                  {result ? (
                    <div className={`p-3 rounded-lg ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-sm font-medium ${
                          result.success
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {result.success ? '성공' : '실패'}
                        </span>
                      </div>
                      {result.error && (
                        <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                      )}
                      {result.content && (
                        <pre className="text-xs bg-white dark:bg-zinc-900 p-3 rounded-lg overflow-x-auto mt-2 border border-zinc-200 dark:border-zinc-700">
                          {result.content.map((c, i) => (
                            <div key={i}>
                              {c.text || c.data || c.uri || JSON.stringify(c)}
                            </div>
                          ))}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">아직 실행 결과가 없습니다</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

