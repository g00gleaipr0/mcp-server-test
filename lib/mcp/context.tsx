'use client';

/**
 * MCP Context - 앱 전체에서 MCP 연결 상태를 공유합니다.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { mcpStore } from './store';
import type {
  McpServerConfig,
  McpServerState,
  McpCapabilitiesResponse,
  McpExecuteRequest,
  McpExecuteResult,
  McpApiResponse,
} from './types';

// Context 값 타입
interface McpContextValue {
  // 등록된 서버 설정 목록 (localStorage)
  servers: McpServerConfig[];
  // 서버별 연결 상태
  serverStates: Map<string, McpServerState>;
  // 로딩 상태
  isLoading: boolean;
  // 오류 메시지
  error: string | null;

  // 서버 관리
  addServer: (config: Omit<McpServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => McpServerConfig;
  updateServer: (config: McpServerConfig) => void;
  deleteServer: (serverId: string) => Promise<void>;

  // 연결 관리
  connect: (serverId: string) => Promise<McpServerState | null>;
  disconnect: (serverId: string) => Promise<void>;

  // Capabilities 조회
  fetchCapabilities: (serverId: string) => Promise<McpCapabilitiesResponse | null>;

  // 기능 실행
  execute: (request: McpExecuteRequest) => Promise<McpExecuteResult | null>;

  // 상태 조회
  getServerState: (serverId: string) => McpServerState | undefined;
  isConnected: (serverId: string) => boolean;

  // 설정 내보내기/가져오기
  exportServers: () => string;
  importServers: (jsonString: string, merge?: boolean) => number;

  // 새로고침
  refreshServers: () => void;
}

// Context 생성
const McpContext = createContext<McpContextValue | null>(null);

// Provider Props
interface McpProviderProps {
  children: ReactNode;
}

/**
 * MCP Provider 컴포넌트
 */
export function McpProvider({ children }: McpProviderProps) {
  // 서버 설정 목록 (localStorage에서 로드)
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  // 서버 연결 상태 Map
  const [serverStates, setServerStates] = useState<Map<string, McpServerState>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 마운트 시 localStorage에서 서버 목록 로드
  useEffect(() => {
    setIsMounted(true);
    const loadedServers = mcpStore.getServers();
    setServers(loadedServers);
  }, []);

  // 서버 목록 새로고침
  const refreshServers = useCallback(() => {
    const loadedServers = mcpStore.getServers();
    setServers(loadedServers);
  }, []);

  // 서버 상태 업데이트 헬퍼
  const updateServerState = useCallback((serverId: string, state: McpServerState) => {
    setServerStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(serverId, state);
      return newMap;
    });
  }, []);

  // 서버 추가
  const addServer = useCallback(
    (config: Omit<McpServerConfig, 'id' | 'createdAt' | 'updatedAt'>): McpServerConfig => {
      const saved = mcpStore.saveServer(config as McpServerConfig);
      setServers((prev) => [...prev, saved]);
      return saved;
    },
    []
  );

  // 서버 수정
  const updateServer = useCallback((config: McpServerConfig) => {
    mcpStore.saveServer(config);
    setServers((prev) =>
      prev.map((s) => (s.id === config.id ? config : s))
    );
  }, []);

  // 서버 삭제
  const deleteServer = useCallback(async (serverId: string) => {
    // 연결되어 있으면 먼저 연결 해제
    const state = serverStates.get(serverId);
    if (state?.status === 'connected') {
      await disconnect(serverId);
    }

    mcpStore.deleteServer(serverId);
    setServers((prev) => prev.filter((s) => s.id !== serverId));
    setServerStates((prev) => {
      const newMap = new Map(prev);
      newMap.delete(serverId);
      return newMap;
    });
  }, [serverStates]);

  // 서버 연결
  const connect = useCallback(
    async (serverId: string): Promise<McpServerState | null> => {
      const config = servers.find((s) => s.id === serverId);
      if (!config) {
        setError(`서버 ${serverId}를 찾을 수 없습니다.`);
        return null;
      }

      setIsLoading(true);
      setError(null);

      // 연결 중 상태로 설정
      updateServerState(serverId, { serverId, status: 'connecting' });

      try {
        const response = await fetch('/api/mcp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config }),
        });

        const result = (await response.json()) as McpApiResponse<McpServerState>;

        if (!result.success || !result.data) {
          throw new Error(result.error || '연결 실패');
        }

        updateServerState(serverId, result.data);
        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '연결 실패';
        updateServerState(serverId, {
          serverId,
          status: 'error',
          error: errorMessage,
        });
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [servers, updateServerState]
  );

  // 서버 연결 해제
  const disconnect = useCallback(
    async (serverId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mcp/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverId }),
        });

        const result = (await response.json()) as McpApiResponse;

        if (!result.success) {
          throw new Error(result.error || '연결 해제 실패');
        }

        updateServerState(serverId, { serverId, status: 'disconnected' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '연결 해제 실패';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [updateServerState]
  );

  // Capabilities 조회
  const fetchCapabilities = useCallback(
    async (serverId: string): Promise<McpCapabilitiesResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/mcp/servers/${serverId}/capabilities`);
        const result = (await response.json()) as McpApiResponse<McpCapabilitiesResponse>;

        if (!result.success || !result.data) {
          throw new Error(result.error || '조회 실패');
        }

        // 상태에 capabilities 업데이트
        const currentState = serverStates.get(serverId);
        if (currentState) {
          updateServerState(serverId, {
            ...currentState,
            tools: result.data.tools,
            prompts: result.data.prompts,
            resources: result.data.resources,
          });
        }

        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '조회 실패';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [serverStates, updateServerState]
  );

  // 기능 실행
  const execute = useCallback(
    async (request: McpExecuteRequest): Promise<McpExecuteResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mcp/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        const result = (await response.json()) as McpApiResponse<McpExecuteResult>;

        if (!result.success || !result.data) {
          throw new Error(result.error || '실행 실패');
        }

        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '실행 실패';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 서버 상태 조회
  const getServerState = useCallback(
    (serverId: string): McpServerState | undefined => {
      return serverStates.get(serverId);
    },
    [serverStates]
  );

  // 연결 상태 확인
  const isConnected = useCallback(
    (serverId: string): boolean => {
      const state = serverStates.get(serverId);
      return state?.status === 'connected';
    },
    [serverStates]
  );

  // 설정 내보내기
  const exportServers = useCallback((): string => {
    return mcpStore.exportServersAsJson();
  }, []);

  // 설정 가져오기
  const importServers = useCallback(
    (jsonString: string, merge: boolean = true): number => {
      const count = mcpStore.importServersFromJson(jsonString, merge);
      refreshServers();
      return count;
    },
    [refreshServers]
  );

  // Context 값
  const value: McpContextValue = {
    servers,
    serverStates,
    isLoading,
    error,
    addServer,
    updateServer,
    deleteServer,
    connect,
    disconnect,
    fetchCapabilities,
    execute,
    getServerState,
    isConnected,
    exportServers,
    importServers,
    refreshServers,
  };

  // 마운트 전에는 null 반환 (hydration 오류 방지)
  if (!isMounted) {
    return null;
  }

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>;
}

/**
 * MCP Context Hook
 */
export function useMcp(): McpContextValue {
  const context = useContext(McpContext);
  if (!context) {
    throw new Error('useMcp must be used within a McpProvider');
  }
  return context;
}

/**
 * 연결된 서버 개수를 반환하는 Hook
 */
export function useConnectedServerCount(): number {
  const { serverStates } = useMcp();
  let count = 0;
  serverStates.forEach((state) => {
    if (state.status === 'connected') {
      count++;
    }
  });
  return count;
}

