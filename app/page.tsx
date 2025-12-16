'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Bot, User, Loader2, Menu, LogOut } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession, Message, ChatResponseChunk, FunctionCall } from '@/lib/types';
import { Sidebar } from '@/app/components/chat-sidebar';
import { MarkdownRenderer } from './components/markdown-renderer';
import { sessionManager } from '@/lib/session';
import { McpStatusBadge } from './components/mcp-status-badge';
import { McpToggle } from './components/mcp-toggle';
import { FunctionCallsDisplay } from './components/function-call-card';
import { McpToolsPanel } from './components/mcp-tools-panel';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // MCP 도구 활성화 상태
  const [mcpEnabled, setMcpEnabled] = useState(false);
  
  // 현재 진행 중인 함수 호출 (실시간 표시용)
  const [pendingFunctionCalls, setPendingFunctionCalls] = useState<FunctionCall[]>([]);

  // Derived state for current messages
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // 세션 확인 및 보호된 라우트
  useEffect(() => {
    setIsMounted(true);
    
    // 로그인 상태 확인
    if (!sessionManager.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // 세션 연장
    sessionManager.extendSession();
  }, [router]);

  // Load sessions from LocalStorage on mount and handle migration
  useEffect(() => {
    if (!isMounted) return;
    
    const savedSessions = localStorage.getItem('chat_sessions');
    const oldMessages = localStorage.getItem('chat_messages');

    if (savedSessions) {
      try {
        const parsedSessions: ChatSession[] = JSON.parse(savedSessions);
        setSessions(parsedSessions);
        // Load last active session or the most recent one
        const lastSessionId = localStorage.getItem('current_chat_id');
        if (lastSessionId && parsedSessions.some(s => s.id === lastSessionId)) {
          setCurrentSessionId(lastSessionId);
          // MCP 상태 복원
          const session = parsedSessions.find(s => s.id === lastSessionId);
          if (session?.mcpEnabled !== undefined) {
            setMcpEnabled(session.mcpEnabled);
          }
        } else if (parsedSessions.length > 0) {
          setCurrentSessionId(parsedSessions[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error('Failed to parse sessions', e);
        createNewSession();
      }
    } else if (oldMessages) {
      // Migrate old messages to a new session
      try {
        const parsedMessages: Message[] = JSON.parse(oldMessages);
        if (parsedMessages.length > 0) {
          const newSessionId = uuidv4();
          const firstUserMessage = parsedMessages.find((m) => m.role === 'user');
          const title = firstUserMessage
            ? firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
            : 'Migrated Chat';
          
          const newSession: ChatSession = {
            id: newSessionId,
            title: title,
            messages: parsedMessages,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setSessions([newSession]);
          setCurrentSessionId(newSessionId);
          localStorage.removeItem('chat_messages');
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error('Failed to migrate old messages', e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions to LocalStorage whenever they change
  useEffect(() => {
    if (isMounted && sessions.length > 0) {
      localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    }
  }, [sessions, isMounted]);

  // Save current session ID
  useEffect(() => {
    if (isMounted && currentSessionId) {
      localStorage.setItem('current_chat_id', currentSessionId);
    }
  }, [currentSessionId, isMounted]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingFunctionCalls]);

  const createNewSession = () => {
    const newSessionId = uuidv4();
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mcpEnabled: mcpEnabled,
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat?')) return;

    const newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);

    if (newSessions.length === 0) {
      createNewSession();
    } else if (currentSessionId === id) {
      setCurrentSessionId(newSessions[0].id);
    }
  };

  const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          let title = session.title;
          if (
            session.title === 'New Chat' &&
            newMessages.length > 0 &&
            newMessages[0].role === 'user'
          ) {
            const content = newMessages[0].content;
            title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
          }

          return {
            ...session,
            messages: newMessages,
            title: title,
            updatedAt: Date.now(),
            mcpEnabled: mcpEnabled,
          };
        }
        return session;
      })
    );
  };

  // MCP 토글 변경 시 세션 업데이트
  const handleMcpToggle = (enabled: boolean) => {
    setMcpEnabled(enabled);
    if (currentSessionId) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? { ...session, mcpEnabled: enabled }
            : session
        )
      );
    }
  };

  // 함수 호출 업데이트 핸들러
  const handleFunctionCallStart = useCallback((fc: FunctionCall) => {
    setPendingFunctionCalls((prev) => [...prev, fc]);
  }, []);

  const handleFunctionCallEnd = useCallback((fc: FunctionCall) => {
    setPendingFunctionCalls((prev) =>
      prev.map((p) => (p.id === fc.id ? fc : p))
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentSessionId) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    updateSessionMessages(currentSessionId, newMessages);
    setInput('');
    setIsLoading(true);
    setPendingFunctionCalls([]); // 이전 함수 호출 초기화

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          mcpEnabled: mcpEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // 모델 응답 플레이스홀더 추가
      let updatedMessagesWithModel = [...newMessages, { role: 'model', content: '', functionCalls: [] } as Message];
      updateSessionMessages(currentSessionId, updatedMessagesWithModel);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = '';
      const completedFunctionCalls: FunctionCall[] = [];

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        
        // 줄 단위로 파싱 (각 줄이 JSON 청크)
        const lines = chunkValue.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const chunk = JSON.parse(line) as ChatResponseChunk;
            
            if (chunk.type === 'text' && chunk.text) {
              // 텍스트 응답 축적
              accumulatedText += chunk.text;
              
              setSessions((prevSessions) => 
                prevSessions.map(session => {
                  if (session.id === currentSessionId) {
                    const msgs = [...session.messages];
                    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'model') {
                      msgs[msgs.length - 1] = { 
                        role: 'model', 
                        content: accumulatedText,
                        functionCalls: completedFunctionCalls.length > 0 
                          ? [...completedFunctionCalls] 
                          : undefined 
                      };
                    }
                    return { ...session, messages: msgs, updatedAt: Date.now() };
                  }
                  return session;
                })
              );
            } else if (chunk.type === 'function_call_start' && chunk.functionCall) {
              // 함수 호출 시작 - 실시간 표시
              handleFunctionCallStart(chunk.functionCall);
            } else if (chunk.type === 'function_call_end' && chunk.functionCall) {
              // 함수 호출 완료 - 상태 업데이트 및 저장
              handleFunctionCallEnd(chunk.functionCall);
              completedFunctionCalls.push(chunk.functionCall);
              
              // 세션에 함수 호출 저장
              setSessions((prevSessions) => 
                prevSessions.map(session => {
                  if (session.id === currentSessionId) {
                    const msgs = [...session.messages];
                    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'model') {
                      msgs[msgs.length - 1] = { 
                        ...msgs[msgs.length - 1],
                        functionCalls: [...completedFunctionCalls] 
                      };
                    }
                    return { ...session, messages: msgs, updatedAt: Date.now() };
                  }
                  return session;
                })
              );
            } else if (chunk.type === 'error') {
              throw new Error(chunk.error || 'Unknown error');
            } else if (chunk.type === 'done') {
              // 완료 - 진행 중인 함수 호출 초기화
              setPendingFunctionCalls([]);
            }
          } catch (parseError) {
            // JSON 파싱 실패 시 일반 텍스트로 처리 (이전 방식 호환)
            if (line.trim() && !line.startsWith('{')) {
              accumulatedText += line;
              
              setSessions((prevSessions) => 
                prevSessions.map(session => {
                  if (session.id === currentSessionId) {
                    const msgs = [...session.messages];
                    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'model') {
                      msgs[msgs.length - 1] = { role: 'model', content: accumulatedText };
                    }
                    return { ...session, messages: msgs, updatedAt: Date.now() };
                  }
                  return session;
                })
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSessions((prevSessions) => 
        prevSessions.map(session => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              messages: [...session.messages, { role: 'model', content: 'Error: Failed to get response. Please try again.' }],
              updatedAt: Date.now()
            };
          }
          return session;
        })
      );
    } finally {
      setIsLoading(false);
      setPendingFunctionCalls([]);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectSession={setCurrentSessionId}
        onDeleteSession={deleteSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full relative w-full">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                 <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                {currentSession?.title || 'Gemini Chat'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* MCP 도구 토글 */}
            <McpToggle enabled={mcpEnabled} onToggle={handleMcpToggle} />
            
            {/* MCP 상태 뱃지 */}
            <McpStatusBadge />
            
            <button
              onClick={() => router.push('/home')}
              className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              홈
            </button>
            <button
              onClick={async () => {
                if (!window.confirm('로그아웃 하시겠습니까?')) return;
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {
                  console.error('Logout API error:', e);
                }
                sessionManager.clearSession();
                router.push('/login');
                router.refresh();
              }}
              className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* MCP 도구 패널 */}
        <McpToolsPanel enabled={mcpEnabled} />

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-6">
              <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <Bot className="w-12 h-12 opacity-50" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">How can I help you today?</h2>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                  {mcpEnabled 
                    ? 'MCP 도구가 활성화되어 있습니다. 외부 도구를 사용할 수 있습니다.'
                    : 'Ask me anything about code, writing, or general knowledge.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex w-full",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-[90%] md:max-w-[80%] rounded-2xl p-4 shadow-sm",
                      msg.role === 'user'
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-tl-none"
                    )}
                  >
                    <div className="flex gap-3 w-full">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        msg.role === 'user' ? "bg-blue-500" : "bg-purple-100 dark:bg-purple-900/30"
                      )}>
                        {msg.role === 'user' ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs mb-1 opacity-70">
                          {msg.role === 'user' ? 'You' : 'Gemini'}
                        </div>
                        
                        {/* 함수 호출 표시 */}
                        {msg.functionCalls && msg.functionCalls.length > 0 && (
                          <FunctionCallsDisplay functionCalls={msg.functionCalls} />
                        )}
                        
                        <div className="text-sm md:text-base overflow-hidden">
                          {msg.role === 'user' ? (
                             <div className="whitespace-pre-wrap leading-relaxed break-words">
                               {msg.content}
                             </div>
                          ) : (
                             <MarkdownRenderer content={msg.content} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 진행 중인 함수 호출 표시 */}
              {pendingFunctionCalls.length > 0 && (
                <div className="flex w-full justify-start">
                  <div className="flex max-w-[90%] md:max-w-[80%] rounded-2xl p-4 shadow-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-tl-none">
                    <div className="flex gap-3 w-full">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-purple-100 dark:bg-purple-900/30">
                        <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs mb-1 opacity-70">Gemini</div>
                        <FunctionCallsDisplay functionCalls={pendingFunctionCalls} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <footer className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mcpEnabled ? "MCP 도구를 사용하여 질문하세요..." : "Message Gemini..."}
              className="w-full pl-6 pr-14 py-3.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <div className="text-center mt-2 text-[10px] text-zinc-400">
            {mcpEnabled 
              ? 'MCP 도구가 활성화되어 외부 기능을 사용합니다.'
              : 'Gemini can make mistakes. Check important info.'
            }
          </div>
        </footer>
      </div>
    </div>
  );
}
