import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 세션 쿠키 삭제 (서버 사이드)
    const response = NextResponse.json({ success: true });
    response.cookies.delete('session');
    
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

