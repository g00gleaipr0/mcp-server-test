// 함수 호출 정보
export interface FunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

// 메시지 역할
export type MessageRole = 'user' | 'model' | 'function';

// 기본 메시지
export interface Message {
  role: MessageRole;
  content: string;
  // MCP 함수 호출 관련 (model 역할일 때)
  functionCalls?: FunctionCall[];
}

// 채팅 세션
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  // MCP 도구 사용 여부
  mcpEnabled?: boolean;
}

// 채팅 요청 (API로 전송)
export interface ChatRequest {
  messages: Message[];
  mcpEnabled?: boolean;
  // 특정 서버만 사용하고 싶을 때
  mcpServerIds?: string[];
}

// 채팅 응답 (API에서 반환) - 스트리밍 청크
export interface ChatResponseChunk {
  type: 'text' | 'function_call_start' | 'function_call_end' | 'error' | 'done';
  // text 타입
  text?: string;
  // function_call 타입
  functionCall?: FunctionCall;
  // error 타입
  error?: string;
}
