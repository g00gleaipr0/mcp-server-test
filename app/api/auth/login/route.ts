import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { loginMethod, phoneNumber, memberNumber, email, password } = await req.json();

    // 로그인 방식 확인
    if (!loginMethod || (loginMethod !== 'phone' && loginMethod !== 'memberNumber' && loginMethod !== 'email')) {
      return NextResponse.json(
        { error: '로그인 방식을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 입력값 검증
    if (loginMethod === 'phone') {
      if (!phoneNumber || !password) {
        return NextResponse.json(
          { error: '휴대폰 번호와 비밀번호를 입력해주세요.' },
          { status: 400 }
        );
      }
    } else if (loginMethod === 'email') {
      if (!email || !password) {
        return NextResponse.json(
          { error: '이메일 주소와 비밀번호를 입력해주세요.' },
          { status: 400 }
        );
      }
    } else {
      // memberNumber
      if (!memberNumber || !password) {
        return NextResponse.json(
          { error: '회원번호와 비밀번호를 입력해주세요.' },
          { status: 400 }
        );
      }
    }

    // TODO: 실제 인증 로직 (DB 조회, 비밀번호 검증 등)
    // 현재는 임시로 간단한 검증만 수행
    // 테스트용: 특정 계정 허용
    
    // 테스트 계정: 전화번호 01040420020, 비밀번호 eogks!alsrnr1
    const isTestAccount = loginMethod === 'phone' && 
      phoneNumber === '01040420020' && 
      password === 'eogks!alsrnr1';
    
    if (password === '1234' || isTestAccount) {
      // JWT 토큰 생성 (실제로는 서버에서 생성해야 함)
      const identifier = loginMethod === 'phone' 
        ? phoneNumber.replace(/[-\s]/g, '')
        : loginMethod === 'email'
        ? email
        : memberNumber;
      const token = Buffer.from(`${identifier}:${Date.now()}`).toString('base64');
      
      return NextResponse.json({
        success: true,
        token,
        phoneNumber: loginMethod === 'phone' ? phoneNumber.replace(/[-\s]/g, '') : undefined,
        email: loginMethod === 'email' ? email : undefined,
        memberNumber: loginMethod === 'memberNumber' ? memberNumber : undefined,
      });
    } else {
      const errorMessages = {
        phone: '휴대폰 번호 또는 비밀번호가 올바르지 않습니다.',
        email: '이메일 주소 또는 비밀번호가 올바르지 않습니다.',
        memberNumber: '회원번호 또는 비밀번호가 올바르지 않습니다.',
      };
      
      return NextResponse.json(
        { error: errorMessages[loginMethod as keyof typeof errorMessages] || '로그인 정보가 올바르지 않습니다.' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: error.message || '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

