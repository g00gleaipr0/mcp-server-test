/**
 * MCP 서버 상태 조회 API
 * GET /api/mcp/status
 * GET /api/mcp/status?serverId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMcpServerState, getAllMcpServerStates } from '@/lib/mcp/global-manager';
import type { McpApiResponse, McpServerState } from '@/lib/mcp/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get('serverId');

    if (serverId) {
      // 특정 서버 상태 조회
      const state = getMcpServerState(serverId);
      
      if (!state) {
        return NextResponse.json<McpApiResponse<McpServerState>>({
          success: true,
          data: {
            serverId,
            status: 'disconnected',
          },
        });
      }

      return NextResponse.json<McpApiResponse<McpServerState>>({
        success: true,
        data: state,
      });
    }

    // 모든 서버 상태 조회
    const allStates = getAllMcpServerStates();

    return NextResponse.json<McpApiResponse<McpServerState[]>>({
      success: true,
      data: allStates,
    });
  } catch (error) {
    console.error('상태 조회 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '조회 실패';
    
    return NextResponse.json<McpApiResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
