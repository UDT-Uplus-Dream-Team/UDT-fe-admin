import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';

/* -------------------------------------------------------------------------- */
/* 타입                                                                      */
/* -------------------------------------------------------------------------- */
interface CustomJWTPayload extends JoseJWTPayload {
  sub: string;
  ROLE: string;
  iat: number;
  exp: number;
}

interface TokenVerificationResult {
  payload: CustomJWTPayload | null;
  isExpired: boolean;
  isInvalid: boolean;
}

interface ReissueResult {
  ok: boolean;
  setCookie?: string;
}

/* -------------------------------------------------------------------------- */
/* 상수                                                                      */
/* -------------------------------------------------------------------------- */
const PUBLIC_PATHS = ['/_next', '/favicon.ico', '/fonts', '/images', '/icons'];
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/* -------------------------------------------------------------------------- */
/* 유틸 함수                                                                  */
/* -------------------------------------------------------------------------- */
function isStaticPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

/* -------------------------------------------------------------------------- */
/* JWT 검증 - 만료/무효 상태 구분                                              */
/* -------------------------------------------------------------------------- */
async function verifyToken(token: string): Promise<TokenVerificationResult> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (
      typeof payload.sub === 'string' &&
      typeof payload.ROLE === 'string' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number'
    ) {
      return {
        payload: payload as CustomJWTPayload,
        isExpired: false,
        isInvalid: false,
      };
    }

    return {
      payload: null,
      isExpired: false,
      isInvalid: true,
    };
  } catch (error: unknown) {
    console.error('JWT VERIFICATION FAILED:', error);

    // jose 라이브러리의 만료 에러 감지
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ERR_JWT_EXPIRED'
    ) {
      return {
        payload: null,
        isExpired: true,
        isInvalid: false,
      };
    }

    return {
      payload: null,
      isExpired: false,
      isInvalid: true,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* 토큰 재발급                                                                */
/* -------------------------------------------------------------------------- */
async function reissueToken(request: NextRequest): Promise<ReissueResult> {
  try {
    console.log('🔄 토큰 재발급 시도 시작');

    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(`${API_BASE_URL}/api/auth/reissue/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
    });

    if (response.status === 204) {
      return {
        ok: true,
        setCookie: response.headers.get('set-cookie') || undefined,
      };
    }

    console.log('재발급 실패:', response.status);
    return { ok: false };
  } catch (error) {
    console.error('재발급 요청 오류:', error);
    return { ok: false };
  }
}

/* -------------------------------------------------------------------------- */
/* 미들웨어                                                                   */
/* -------------------------------------------------------------------------- */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* -------- 정적 자원 무시 -------- */
  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  /* -------- 쿠키에서 토큰 추출 -------- */
  const token = request.cookies.get('Authorization')?.value;

  /* -------- 토큰이 없는 경우 /login으로 리다이렉트 -------- */
  if (!token) {
    if (pathname === '/login') {
      return NextResponse.next(); // /login 페이지는 허용
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  /* -------- 토큰 검증 -------- */
  const verification = await verifyToken(token);

  if (verification.payload) {
    // 유효한 토큰이 있는 경우

    // ROLE_ADMIN이 아니면 로그인 페이지로 리다이렉트
    if (verification.payload.ROLE !== 'ROLE_ADMIN') {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('Authorization');
      return response;
    }

    // 로그인된 관리자가 /login에 접근하려고 하면 홈으로 리다이렉트
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 모든 다른 경로는 허용
    return NextResponse.next();
  }

  if (verification.isExpired) {
    // 만료된 토큰이면 재발급 시도
    const { ok, setCookie } = await reissueToken(request);

    if (ok) {
      // 재발급 성공 시 같은 경로로 리다이렉트
      const response = NextResponse.redirect(new URL(pathname, request.url));
      if (setCookie) {
        response.headers.set('set-cookie', setCookie);
      }
      return response;
    }

    // 재발급 실패 시 로그인 페이지로
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('Authorization');
    return response;
  }

  // 무효한 토큰인 경우 로그인 페이지로
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('Authorization');
  return response;
}

/* -------------------------------------------------------------------------- */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
