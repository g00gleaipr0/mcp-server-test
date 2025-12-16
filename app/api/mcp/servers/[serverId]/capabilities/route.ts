/**
 * MCP 서버 Capabilities 조회 API
 * GET /api/mcp/servers/[serverId]/capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchServerCapabilities, isMcpServerConnected } from '@/lib/mcp/global-manager';
import type { McpApiResponse, McpCapabilitiesResponse } from '@/lib/mcp/types';

interface RouteParams {
  params: Promise<{
    serverId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { serverId } = await params;

    if (!serverId) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: 'serverId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 연결 상태 확인
    if (!isMcpServerConnected(serverId)) {
      return NextResponse.json<McpApiResponse>(
        { success: false, error: '서버가 연결되어 있지 않습니다.' },
        { status: 400 }
      );
    }

    // Capabilities 조회
    const capabilities = await fetchServerCapabilities(serverId);

    return NextResponse.json<McpApiResponse<McpCapabilitiesResponse>>({
      success: true,
      data: capabilities,
    });
  } catch (error) {
    console.error('Capabilities 조회 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '조회 실패';
    
    return NextResponse.json<McpApiResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
