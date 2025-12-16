// 세션 관리 유틸리티
export interface UserSession {
  token: string;
  username?: string;
  expiresAt: number;
}

const SESSION_KEY = 'user_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7일

export const sessionManager = {
  // 세션 저장
  setSession(data: { token: string; username?: string }): void {
    const session: UserSession = {
      token: data.token,
      username: data.username,
      expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  // 세션 가져오기
  getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;

    try {
      const session: UserSession = JSON.parse(sessionStr);
      
      // 만료 확인
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (e) {
      console.error('Failed to parse session', e);
      return null;
    }
  },

  // 세션 삭제 (로그아웃)
  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  // 로그인 상태 확인
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },

  // 세션 연장
  extendSession(): void {
    const session = this.getSession();
    if (session) {
      session.expiresAt = Date.now() + SESSION_DURATION;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  },
};
