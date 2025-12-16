/**
 * MCP 서버 연결 API
 * POST /api/mcp/connect
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectMcpServer } from '@/lib/mcp/global-manager';
import type { McpConnectRequest, McpApiResponse, McpServerState } from '@/lib/mcp/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as McpConnectRequest;
    const { config } = body;

    // 필수 필드 검증
    if (!config || !config.id || !config.name || !config.type) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: '서버 설정이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // 타입별 필수 필드 검증
    if (config.type === 'stdio' && !config.command) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: 'STDIO 방식은 command가 필요합니다.' },
        { status: 400 }
      );
    }

    if (config.type === 'streamable-http' && !config.url) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: 'Streamable HTTP 방식은 url이 필요합니다.' },
        { status: 400 }
      );
    }

    // 전역 MCP Manager를 통해 연결
    const serverState = await connectMcpServer(config);

    return NextResponse.json<McpApiResponse<McpServerState>>({
      success: true,
      data: serverState,
    });
  } catch (error) {
    console.error('MCP 연결 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '연결 실패';
    
    return NextResponse.json<McpApiResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
