/**
 * MCP 서버 설정 저장소 - localStorage 기반
 * 클라이언트 사이드에서만 사용됩니다.
 */

import { v4 as uuidv4 } from 'uuid';
import type { McpServerConfig, McpExportData, McpTransportType } from './types';

// localStorage 키
const MCP_SERVERS_KEY = 'mcp_servers';
const EXPORT_VERSION = '1.0.0';

/**
 * MCP 서버 설정 저장소
 */
export const mcpStore = {
  /**
   * 모든 서버 설정을 조회합니다.
   */
  getServers(): McpServerConfig[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(MCP_SERVERS_KEY);
      if (!data) return [];
      return JSON.parse(data) as McpServerConfig[];
    } catch (error) {
      console.error('MCP 서버 설정 조회 실패:', error);
      return [];
    }
  },

  /**
   * 특정 서버 설정을 조회합니다.
   */
  getServer(serverId: string): McpServerConfig | undefined {
    const servers = this.getServers();
    return servers.find((s) => s.id === serverId);
  },

  /**
   * 서버 설정을 저장합니다 (추가 또는 업데이트).
   */
  saveServer(config: Partial<McpServerConfig> & { name: string; type: McpTransportType }): McpServerConfig {
    const servers = this.getServers();
    const now = Date.now();

    // ID가 있으면 업데이트, 없으면 추가
    if (config.id) {
      const index = servers.findIndex((s) => s.id === config.id);
      if (index >= 0) {
        // 업데이트
        const updated: McpServerConfig = {
          ...servers[index],
          ...config,
          updatedAt: now,
        };
        servers[index] = updated;
        this.setServers(servers);
        return updated;
      }
    }

    // 새로 추가
    const newConfig: McpServerConfig = {
      id: config.id || uuidv4(),
      name: config.name,
      type: config.type,
      command: config.command,
      args: config.args,
      env: config.env,
      url: config.url,
      headers: config.headers,
      createdAt: now,
      updatedAt: now,
    };
    servers.push(newConfig);
    this.setServers(servers);
    return newConfig;
  },

  /**
   * 서버 설정을 삭제합니다.
   */
  deleteServer(serverId: string): boolean {
    const servers = this.getServers();
    const filtered = servers.filter((s) => s.id !== serverId);
    
    if (filtered.length === servers.length) {
      return false; // 삭제된 항목 없음
    }

    this.setServers(filtered);
    return true;
  },

  /**
   * 모든 서버 설정을 삭제합니다.
   */
  clearServers(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(MCP_SERVERS_KEY);
  },

  /**
   * 서버 설정을 내보냅니다 (JSON).
   */
  exportServers(): McpExportData {
    const servers = this.getServers();
    return {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      servers,
    };
  },

  /**
   * 서버 설정을 JSON 문자열로 내보냅니다.
   */
  exportServersAsJson(): string {
    const data = this.exportServers();
    return JSON.stringify(data, null, 2);
  },

  /**
   * 서버 설정을 가져옵니다 (JSON).
   * @param merge true면 기존 설정과 병합, false면 대체
   */
  importServers(data: McpExportData, merge: boolean = true): number {
    if (!data || !Array.isArray(data.servers)) {
      throw new Error('올바른 MCP 설정 데이터가 아닙니다.');
    }

    const existingServers = merge ? this.getServers() : [];
    const existingIds = new Set(existingServers.map((s) => s.id));
    const now = Date.now();
    let importedCount = 0;

    for (const serverConfig of data.servers) {
      // 필수 필드 검증
      if (!serverConfig.name || !serverConfig.type) {
        console.warn('유효하지 않은 서버 설정 건너뜀:', serverConfig);
        continue;
      }

      // 유효한 타입인지 확인
      if (serverConfig.type !== 'stdio' && serverConfig.type !== 'streamable-http') {
        console.warn('지원하지 않는 타입 건너뜀:', serverConfig.type);
        continue;
      }

      if (merge && existingIds.has(serverConfig.id)) {
        // 병합 모드에서 이미 존재하면 업데이트
        const index = existingServers.findIndex((s) => s.id === serverConfig.id);
        existingServers[index] = {
          ...serverConfig,
          updatedAt: now,
        };
      } else {
        // 새로 추가 (ID 충돌 방지를 위해 새 ID 생성)
        const newConfig: McpServerConfig = {
          ...serverConfig,
          id: merge && existingIds.has(serverConfig.id) ? uuidv4() : (serverConfig.id || uuidv4()),
          createdAt: serverConfig.createdAt || now,
          updatedAt: now,
        };
        existingServers.push(newConfig);
      }
      importedCount++;
    }

    this.setServers(existingServers);
    return importedCount;
  },

  /**
   * JSON 문자열에서 서버 설정을 가져옵니다.
   */
  importServersFromJson(jsonString: string, merge: boolean = true): number {
    try {
      const data = JSON.parse(jsonString) as McpExportData;
      return this.importServers(data, merge);
    } catch (error) {
      throw new Error('JSON 파싱 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  },

  /**
   * 내부: 서버 설정을 localStorage에 저장합니다.
   */
  setServers(servers: McpServerConfig[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers));
  },
};

/**
 * STDIO 서버 설정 생성 헬퍼
 */
export function createStdioServerConfig(
  name: string,
  command: string,
  args?: string[],
  env?: Record<string, string>
): Omit<McpServerConfig, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name,
    type: 'stdio',
    command,
    args,
    env,
  };
}

/**
 * Streamable HTTP 서버 설정 생성 헬퍼
 */
export function createHttpServerConfig(
  name: string,
  url: string,
  headers?: Record<string, string>
): Omit<McpServerConfig, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name,
    type: 'streamable-http',
    url,
    headers,
  };
}

