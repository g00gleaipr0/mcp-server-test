/**
 * MCP (Model Context Protocol) 관련 타입 정의
 */

// MCP 서버 연결 타입
export type McpTransportType = 'stdio' | 'streamable-http';

// MCP 서버 설정
export interface McpServerConfig {
  id: string;
  name: string;
  type: McpTransportType;
  // STDIO 방식용
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // Streamable HTTP 방식용
  url?: string;
  headers?: Record<string, string>;
  // 메타 정보
  createdAt: number;
  updatedAt: number;
}

// MCP 서버 연결 상태
export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// MCP 서버 상태 (런타임)
export interface McpServerState {
  serverId: string;
  status: McpConnectionStatus;
  error?: string;
  tools?: McpTool[];
  prompts?: McpPrompt[];
  resources?: McpResource[];
}

// MCP Tool 정의
export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

// MCP Prompt 정의
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

// MCP Resource 정의
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// MCP 실행 요청 타입
export type McpExecuteType = 'tool' | 'prompt' | 'resource';

// Tool 실행 요청
export interface McpToolExecuteRequest {
  type: 'tool';
  serverId: string;
  name: string;
  arguments?: Record<string, unknown>;
}

// Prompt 실행 요청
export interface McpPromptExecuteRequest {
  type: 'prompt';
  serverId: string;
  name: string;
  arguments?: Record<string, string>;
}

// Resource 읽기 요청
export interface McpResourceExecuteRequest {
  type: 'resource';
  serverId: string;
  uri: string;
}

// MCP 실행 요청 통합 타입
export type McpExecuteRequest =
  | McpToolExecuteRequest
  | McpPromptExecuteRequest
  | McpResourceExecuteRequest;

// MCP 실행 결과
export interface McpExecuteResult {
  success: boolean;
  content?: McpContent[];
  error?: string;
}

// MCP Content 타입
export interface McpContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

// API 응답 타입
export interface McpApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 서버 연결 요청
export interface McpConnectRequest {
  config: McpServerConfig;
}

// 서버 연결 해제 요청
export interface McpDisconnectRequest {
  serverId: string;
}

// Capabilities 조회 응답
export interface McpCapabilitiesResponse {
  tools: McpTool[];
  prompts: McpPrompt[];
  resources: McpResource[];
}

// 설정 내보내기/가져오기용
export interface McpExportData {
  version: string;
  exportedAt: number;
  servers: McpServerConfig[];
}

