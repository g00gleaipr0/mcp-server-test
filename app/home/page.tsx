'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, MessageSquare, Settings, Server, User } from 'lucide-react';
import { sessionManager } from '@/lib/session';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    
    // 세션 확인
    const session = sessionManager.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setUsername(session.username || '사용자');
    
    // 세션 연장 (활동 중일 때)
    const interval = setInterval(() => {
      sessionManager.extendSession();
    }, 30 * 60 * 1000); // 30분마다 연장

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    if (!window.confirm('로그아웃 하시겠습니까?')) return;

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout API error:', e);
    }
    
    sessionManager.clearSession();
    router.push('/login');
    router.refresh();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MCP Chat
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            환영합니다! 👋
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            원하는 서비스를 선택하세요
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* AI 채팅 */}
          <button
            onClick={() => router.push('/')}
            className={cn(
              "group p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700",
              "hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all",
              "text-left"
            )}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                AI 채팅
              </h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Gemini AI와 대화하고 MCP 도구를 활용하세요
            </p>
          </button>

          {/* MCP 서버 관리 */}
          <button
            onClick={() => router.push('/mcp')}
            className={cn(
              "group p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700",
              "hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl transition-all",
              "text-left"
            )}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <Server className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                MCP 서버 관리
              </h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              MCP 서버 연결 및 도구 설정
            </p>
          </button>

          {/* 프로필 설정 (준비 중) */}
          <button
            onClick={() => alert('준비 중인 기능입니다.')}
            className={cn(
              "group p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700",
              "hover:border-zinc-500 dark:hover:border-zinc-500 hover:shadow-xl transition-all",
              "text-left opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <User className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                프로필 설정
              </h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              계정 정보를 관리하세요 (준비 중)
            </p>
          </button>

          {/* 설정 (준비 중) */}
          <button
            onClick={() => alert('준비 중인 기능입니다.')}
            className={cn(
              "group p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700",
              "hover:border-zinc-500 dark:hover:border-zinc-500 hover:shadow-xl transition-all",
              "text-left opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <Settings className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                설정
              </h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              앱 설정을 변경하세요 (준비 중)
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
