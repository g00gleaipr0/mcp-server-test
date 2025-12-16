/**
 * MCP Client Manager - 싱글톤 패턴
 * 서버 사이드에서만 실행되며, 여러 MCP 서버 연결을 관리합니다.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  McpServerConfig,
  McpServerState,
  McpTool,
  McpPrompt,
  McpResource,
  McpContent,
  McpExecuteRequest,
  McpExecuteResult,
  McpCapabilitiesResponse,
} from './types';

// 연결된 클라이언트 정보
interface ConnectedClient {
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  config: McpServerConfig;
}

class McpClientManager {
  // 연결된 클라이언트들을 저장하는 Map (serverId -> ConnectedClient)
  private clients: Map<string, ConnectedClient> = new Map();
  
  // 서버 상태를 저장하는 Map (serverId -> McpServerState)
  private serverStates: Map<string, McpServerState> = new Map();

  /**
   * MCP 서버에 연결합니다.
   */
  async connect(config: McpServerConfig): Promise<McpServerState> {
    const { id: serverId } = config;

    // 이미 연결되어 있으면 기존 상태 반환
    if (this.clients.has(serverId)) {
      const existingState = this.serverStates.get(serverId);
      if (existingState && existingState.status === 'connected') {
        return existingState;
      }
    }

    // 연결 중 상태로 설정
    this.updateServerState(serverId, { status: 'connecting' });

    try {
      // Client 인스턴스 생성
      const client = new Client({
        name: `mcp-host-${serverId}`,
        version: '1.0.0',
      });

      // Transport 생성 (타입에 따라)
      let transport: StdioClientTransport | StreamableHTTPClientTransport;

      if (config.type === 'stdio') {
        // STDIO 방식
        if (!config.command) {
          throw new Error('STDIO 방식은 command가 필요합니다.');
        }
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: config.env,
        });
      } else if (config.type === 'streamable-http') {
        // Streamable HTTP 방식
        if (!config.url) {
          throw new Error('Streamable HTTP 방식은 url이 필요합니다.');
        }
        transport = new StreamableHTTPClientTransport(
          new URL(config.url),
          {
            requestInit: config.headers
              ? { headers: config.headers }
              : undefined,
          }
        );
      } else {
        throw new Error(`지원하지 않는 transport 타입: ${config.type}`);
      }

      // 연결 수행
      await client.connect(transport);

      // 연결된 클라이언트 저장
      this.clients.set(serverId, { client, transport, config });

      // Capabilities 조회
      const capabilities = await this.fetchCapabilities(serverId);

      // 연결 성공 상태 업데이트
      const state: McpServerState = {
        serverId,
        status: 'connected',
        tools: capabilities.tools,
        prompts: capabilities.prompts,
        resources: capabilities.resources,
      };
      this.serverStates.set(serverId, state);

      return state;
    } catch (error) {
      // 연결 실패 상태 업데이트
      const errorMessage = error instanceof Error ? error.message : '연결 실패';
      const state: McpServerState = {
        serverId,
        status: 'error',
        error: errorMessage,
      };
      this.serverStates.set(serverId, state);

      // 실패한 클라이언트 정리
      this.clients.delete(serverId);

      throw error;
    }
  }

  /**
   * MCP 서버 연결을 해제합니다.
   */
  async disconnect(serverId: string): Promise<void> {
    const connectedClient = this.clients.get(serverId);
    
    if (connectedClient) {
      try {
        await connectedClient.client.close();
      } catch (error) {
        console.error(`서버 ${serverId} 연결 해제 중 오류:`, error);
      }
      this.clients.delete(serverId);
    }

    // 상태 업데이트
    this.updateServerState(serverId, { status: 'disconnected' });
  }

  /**
   * 모든 MCP 서버 연결을 해제합니다.
   */
  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    await Promise.all(serverIds.map((id) => this.disconnect(id)));
  }

  /**
   * 서버의 Capabilities(Tools, Prompts, Resources)를 조회합니다.
   */
  async fetchCapabilities(serverId: string): Promise<McpCapabilitiesResponse> {
    const connectedClient = this.clients.get(serverId);
    
    if (!connectedClient) {
      throw new Error(`서버 ${serverId}가 연결되어 있지 않습니다.`);
    }

    const { client } = connectedClient;

    // 병렬로 조회
    const [toolsResult, promptsResult, resourcesResult] = await Promise.allSettled([
      client.listTools(),
      client.listPrompts(),
      client.listResources(),
    ]);

    // Tools 파싱
    const tools: McpTool[] =
      toolsResult.status === 'fulfilled'
        ? toolsResult.value.tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema as Record<string, unknown> | undefined,
          }))
        : [];

    // Prompts 파싱
    const prompts: McpPrompt[] =
      promptsResult.status === 'fulfilled'
        ? promptsResult.value.prompts.map((p) => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments?.map((a) => ({
              name: a.name,
              description: a.description,
              required: a.required,
            })),
          }))
        : [];

    // Resources 파싱
    const resources: McpResource[] =
      resourcesResult.status === 'fulfilled'
        ? resourcesResult.value.resources.map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          }))
        : [];

    return { tools, prompts, resources };
  }

  /**
   * MCP 기능을 실행합니다 (Tool 호출, Prompt 조회, Resource 읽기).
   */
  async execute(request: McpExecuteRequest): Promise<McpExecuteResult> {
    const connectedClient = this.clients.get(request.serverId);
    
    if (!connectedClient) {
      return {
        success: false,
        error: `서버 ${request.serverId}가 연결되어 있지 않습니다.`,
      };
    }

    const { client } = connectedClient;

    try {
      switch (request.type) {
        case 'tool': {
          // Tool 호출
          const result = await client.callTool({
            name: request.name,
            arguments: request.arguments || {},
          });

          const content: McpContent[] = (result.content as Array<{ type: string; text?: string; data?: string; mimeType?: string }>).map((c) => ({
            type: c.type as 'text' | 'image' | 'resource',
            text: c.text,
            data: c.data,
            mimeType: c.mimeType,
          }));

          return { success: true, content };
        }

        case 'prompt': {
          // Prompt 조회
          const result = await client.getPrompt({
            name: request.name,
            arguments: request.arguments,
          });

          const content: McpContent[] = result.messages.map((m) => {
            const msgContent = m.content;
            if (typeof msgContent === 'string') {
              return { type: 'text' as const, text: msgContent };
            }
            // TextContent 타입인 경우
            if ('text' in msgContent) {
              return { type: 'text' as const, text: msgContent.text };
            }
            return { type: 'text' as const, text: JSON.stringify(msgContent) };
          });

          return { success: true, content };
        }

        case 'resource': {
          // Resource 읽기
          const result = await client.readResource({
            uri: request.uri,
          });

          const content: McpContent[] = result.contents.map((c) => ({
            type: 'resource' as const,
            uri: c.uri,
            text: 'text' in c ? c.text : undefined,
            data: 'blob' in c ? c.blob : undefined,
            mimeType: c.mimeType,
          }));

          return { success: true, content };
        }

        default:
          return { success: false, error: '알 수 없는 실행 타입입니다.' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '실행 실패';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 특정 서버의 상태를 조회합니다.
   */
  getServerState(serverId: string): McpServerState | undefined {
    return this.serverStates.get(serverId);
  }

  /**
   * 모든 서버의 상태를 조회합니다.
   */
  getAllServerStates(): McpServerState[] {
    return Array.from(this.serverStates.values());
  }

  /**
   * 서버가 연결되어 있는지 확인합니다.
   */
  isConnected(serverId: string): boolean {
    const state = this.serverStates.get(serverId);
    return state?.status === 'connected';
  }

  /**
   * 서버 상태를 업데이트합니다.
   */
  private updateServerState(
    serverId: string,
    update: Partial<McpServerState>
  ): void {
    const existing = this.serverStates.get(serverId) || {
      serverId,
      status: 'disconnected' as const,
    };
    this.serverStates.set(serverId, { ...existing, ...update });
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
// Node.js 환경에서만 인스턴스 생성 (서버 사이드)
let mcpClientManager: McpClientManager | null = null;

export function getMcpClientManager(): McpClientManager {
  if (!mcpClientManager) {
    mcpClientManager = new McpClientManager();
  }
  return mcpClientManager;
}

// 테스트/개발용 리셋 함수
export function resetMcpClientManager(): void {
  if (mcpClientManager) {
    mcpClientManager.disconnectAll();
    mcpClientManager = null;
  }
}

