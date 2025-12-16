/**
 * 전역 MCP Client Manager
 * Node.js의 global 객체를 사용하여 Next.js 서버 인스턴스 간 MCP 연결 상태를 공유합니다.
 * 이렇게 하면 페이지 이동이나 HMR(Hot Module Replacement) 시에도 연결이 유지됩니다.
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
  McpCapabilitiesResponse,
} from './types';

// 연결된 클라이언트 정보
interface ConnectedClient {
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  config: McpServerConfig;
}

// Global 타입 확장
declare global {
  // eslint-disable-next-line no-var
  var __mcpClients: Map<string, ConnectedClient> | undefined;
  // eslint-disable-next-line no-var
  var __mcpServerStates: Map<string, McpServerState> | undefined;
}

/**
 * 전역 MCP 클라이언트 저장소 가져오기
 */
function getGlobalClients(): Map<string, ConnectedClient> {
  if (!global.__mcpClients) {
    global.__mcpClients = new Map();
  }
  return global.__mcpClients;
}

/**
 * 전역 서버 상태 저장소 가져오기
 */
function getGlobalServerStates(): Map<string, McpServerState> {
  if (!global.__mcpServerStates) {
    global.__mcpServerStates = new Map();
  }
  return global.__mcpServerStates;
}

/**
 * MCP 서버에 연결합니다.
 */
export async function connectMcpServer(config: McpServerConfig): Promise<McpServerState> {
  const clients = getGlobalClients();
  const serverStates = getGlobalServerStates();
  const { id: serverId } = config;

  // 이미 연결되어 있으면 기존 상태 반환
  if (clients.has(serverId)) {
    const existingState = serverStates.get(serverId);
    if (existingState && existingState.status === 'connected') {
      console.log(`[MCP] 서버 ${serverId} 이미 연결됨`);
      return existingState;
    }
  }

  // 연결 중 상태로 설정
  updateServerState(serverId, { status: 'connecting' });

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
      console.log(`[MCP] STDIO 연결 시작: ${config.command} ${config.args?.join(' ') || ''}`);
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
      console.log(`[MCP] HTTP 연결 시작: ${config.url}`);
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
    console.log(`[MCP] 서버 ${serverId} 연결 성공`);

    // 연결된 클라이언트 저장
    clients.set(serverId, { client, transport, config });

    // Capabilities 조회
    const capabilities = await fetchServerCapabilities(serverId);

    // 연결 성공 상태 업데이트
    const state: McpServerState = {
      serverId,
      status: 'connected',
      tools: capabilities.tools,
      prompts: capabilities.prompts,
      resources: capabilities.resources,
    };
    serverStates.set(serverId, state);

    return state;
  } catch (error) {
    // 연결 실패 상태 업데이트
    const errorMessage = error instanceof Error ? error.message : '연결 실패';
    console.error(`[MCP] 서버 ${serverId} 연결 실패:`, errorMessage);
    
    const state: McpServerState = {
      serverId,
      status: 'error',
      error: errorMessage,
    };
    serverStates.set(serverId, state);

    // 실패한 클라이언트 정리
    clients.delete(serverId);

    throw error;
  }
}

/**
 * MCP 서버 연결을 해제합니다.
 */
export async function disconnectMcpServer(serverId: string): Promise<void> {
  const clients = getGlobalClients();
  const connectedClient = clients.get(serverId);
  
  if (connectedClient) {
    try {
      await connectedClient.client.close();
      console.log(`[MCP] 서버 ${serverId} 연결 해제됨`);
    } catch (error) {
      console.error(`[MCP] 서버 ${serverId} 연결 해제 중 오류:`, error);
    }
    clients.delete(serverId);
  }

  // 상태 업데이트
  updateServerState(serverId, { status: 'disconnected' });
}

/**
 * 모든 MCP 서버 연결을 해제합니다.
 */
export async function disconnectAllMcpServers(): Promise<void> {
  const clients = getGlobalClients();
  const serverIds = Array.from(clients.keys());
  await Promise.all(serverIds.map((id) => disconnectMcpServer(id)));
}

/**
 * 서버의 Capabilities를 조회합니다.
 */
export async function fetchServerCapabilities(serverId: string): Promise<McpCapabilitiesResponse> {
  const clients = getGlobalClients();
  const connectedClient = clients.get(serverId);
  
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
 * 연결된 MCP Client 인스턴스를 가져옵니다.
 * mcpToTool에 전달하기 위해 사용됩니다.
 */
export function getMcpClient(serverId: string): Client | undefined {
  const clients = getGlobalClients();
  return clients.get(serverId)?.client;
}

/**
 * 모든 연결된 MCP Client 인스턴스를 가져옵니다.
 */
export function getAllConnectedMcpClients(): Client[] {
  const clients = getGlobalClients();
  const serverStates = getGlobalServerStates();
  const connectedClients: Client[] = [];
  
  for (const [serverId, { client }] of clients.entries()) {
    const state = serverStates.get(serverId);
    if (state?.status === 'connected') {
      connectedClients.push(client);
    }
  }
  
  return connectedClients;
}

/**
 * 특정 서버의 상태를 조회합니다.
 */
export function getMcpServerState(serverId: string): McpServerState | undefined {
  const serverStates = getGlobalServerStates();
  return serverStates.get(serverId);
}

/**
 * 모든 서버의 상태를 조회합니다.
 */
export function getAllMcpServerStates(): McpServerState[] {
  const serverStates = getGlobalServerStates();
  return Array.from(serverStates.values());
}

/**
 * 서버가 연결되어 있는지 확인합니다.
 */
export function isMcpServerConnected(serverId: string): boolean {
  const serverStates = getGlobalServerStates();
  const state = serverStates.get(serverId);
  return state?.status === 'connected';
}

/**
 * 연결된 서버 ID 목록을 가져옵니다.
 */
export function getConnectedServerIds(): string[] {
  const serverStates = getGlobalServerStates();
  const connected: string[] = [];
  
  for (const [serverId, state] of serverStates.entries()) {
    if (state.status === 'connected') {
      connected.push(serverId);
    }
  }
  
  return connected;
}

/**
 * 서버 상태를 업데이트합니다.
 */
function updateServerState(serverId: string, update: Partial<McpServerState>): void {
  const serverStates = getGlobalServerStates();
  const existing = serverStates.get(serverId) || {
    serverId,
    status: 'disconnected' as const,
  };
  serverStates.set(serverId, { ...existing, ...update });
}

/**
 * MCP 도구를 실행합니다.
 * @param toolName 도구 이름
 * @param args 도구 인자
 * @returns 실행 결과
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result?: string; error?: string }> {
  const clients = getGlobalClients();
  const serverStates = getGlobalServerStates();

  // 모든 연결된 서버에서 도구 찾기
  for (const [serverId, { client }] of clients.entries()) {
    const state = serverStates.get(serverId);
    if (state?.status !== 'connected') continue;

    const tool = state.tools?.find((t) => t.name === toolName);
    if (tool) {
      try {
        console.log(`[MCP] Calling tool ${toolName} on server ${serverId}`);
        const result = await client.callTool({
          name: toolName,
          arguments: args,
        });

        // 결과 파싱
        const content = result.content as Array<{ type: string; text?: string }>;
        const textContent = content
          .filter((c) => c.type === 'text' && c.text)
          .map((c) => c.text)
          .join('\n');

        return {
          success: true,
          result: textContent || JSON.stringify(result.content),
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '도구 실행 실패';
        console.error(`[MCP] Tool ${toolName} error:`, errorMessage);
        return { success: false, error: errorMessage };
      }
    }
  }

  return { success: false, error: `도구 ${toolName}을 찾을 수 없습니다.` };
}

/**
 * 모든 연결된 서버의 도구를 Gemini FunctionDeclaration 형식으로 반환합니다.
 */
export function getAllToolsAsFunctionDeclarations(): Array<{
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}> {
  const serverStates = getGlobalServerStates();
  const declarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> = [];

  for (const state of serverStates.values()) {
    if (state.status !== 'connected' || !state.tools) continue;

    for (const tool of state.tools) {
      declarations.push({
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema || { type: 'object', properties: {} },
      });
    }
  }

  return declarations;
}

/**
 * 연결된 모든 서버의 도구 총 개수를 반환합니다.
 */
export function getTotalToolsCount(): number {
  const serverStates = getGlobalServerStates();
  let count = 0;

  for (const state of serverStates.values()) {
    if (state.status === 'connected' && state.tools) {
      count += state.tools.length;
    }
  }

  return count;
}

/**
 * 연결된 서버 정보와 도구 목록을 반환합니다.
 */
export function getConnectedServersInfo(): Array<{
  serverId: string;
  serverName: string;
  tools: McpTool[];
}> {
  const clients = getGlobalClients();
  const serverStates = getGlobalServerStates();
  const info: Array<{
    serverId: string;
    serverName: string;
    tools: McpTool[];
  }> = [];

  for (const [serverId, { config }] of clients.entries()) {
    const state = serverStates.get(serverId);
    if (state?.status === 'connected') {
      info.push({
        serverId,
        serverName: config.name,
        tools: state.tools || [],
      });
    }
  }

  return info;
}

