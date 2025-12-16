/**
 * MCP 서버 연결 해제 API
 * POST /api/mcp/disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { disconnectMcpServer } from '@/lib/mcp/global-manager';
import type { McpDisconnectRequest, McpApiResponse } from '@/lib/mcp/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as McpDisconnectRequest;
    const { serverId } = body;

    // 필수 필드 검증
    if (!serverId) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: 'serverId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 전역 MCP Manager를 통해 연결 해제
    await disconnectMcpServer(serverId);

    return NextResponse.json<McpApiResponse>({
      success: true,
    });
  } catch (error) {
    console.error('MCP 연결 해제 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '연결 해제 실패';
    
    return NextResponse.json<McpApiResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
