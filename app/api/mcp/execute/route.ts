/**
 * MCP 기능 실행 API
 * POST /api/mcp/execute
 * 
 * Tool 호출, Prompt 조회, Resource 읽기를 수행합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMcpClientManager } from '@/lib/mcp/client-manager';
import type { McpExecuteRequest, McpApiResponse, McpExecuteResult } from '@/lib/mcp/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as McpExecuteRequest;

    // 필수 필드 검증
    if (!body.type || !body.serverId) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: 'type과 serverId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 타입별 필수 필드 검증
    if (body.type === 'tool' && !body.name) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: 'Tool 실행은 name이 필요합니다.' },
        { status: 400 }
      );
    }

    if (body.type === 'prompt' && !body.name) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: 'Prompt 조회는 name이 필요합니다.' },
        { status: 400 }
      );
    }

    if (body.type === 'resource' && !body.uri) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: 'Resource 읽기는 uri가 필요합니다.' },
        { status: 400 }
      );
    }

    const manager = getMcpClientManager();

    // 연결 상태 확인
    if (!manager.isConnected(body.serverId)) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: '서버가 연결되어 있지 않습니다.' },
        { status: 400 }
      );
    }

    // 실행
    const result = await manager.execute(body);

    if (!result.success) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json<McpApiResponse<McpExecuteResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('MCP 실행 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '실행 실패';
    
    return NextResponse.json<McpApiResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

