'use client';

import React from 'react';
import { Plus, MessageSquare, Trash2, X, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatSession } from '@/lib/types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen,
  onClose,
}: SidebarProps) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed md:relative z-30 flex flex-col h-full w-[260px] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-all shadow-sm group"
          >
            <div className="p-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
               <Plus className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </div>
            <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 px-4 mb-2 uppercase tracking-wider">
            History
          </div>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  if (window.innerWidth < 768) onClose();
                }}
                className={cn(
                  "group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors relative",
                  currentSessionId === session.id
                    ? "bg-zinc-200/60 dark:bg-zinc-800"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                )}
              >
                <MessageSquare className={cn(
                  "w-4 h-4 shrink-0",
                  currentSessionId === session.id 
                    ? "text-zinc-900 dark:text-zinc-100" 
                    : "text-zinc-400 dark:text-zinc-500"
                )} />
                <div className="flex-1 overflow-hidden">
                  <p className={cn(
                    "text-sm truncate pr-6",
                    currentSessionId === session.id 
                      ? "font-medium text-zinc-900 dark:text-zinc-100" 
                      : "text-zinc-600 dark:text-zinc-400"
                  )}>
                    {session.title || 'New Chat'}
                  </p>
                </div>
                
                <button
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-300/50 dark:hover:bg-zinc-700 rounded-md transition-all text-zinc-500 hover:text-red-500"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No chat history
              </div>
            )}
          </div>
        </div>

        {/* Mobile Close Button (inside sidebar) */}
        <div className="md:hidden p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="flex items-center gap-2 w-full px-4 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Close Sidebar</span>
          </button>
        </div>
      </aside>
    </>
  );
};

