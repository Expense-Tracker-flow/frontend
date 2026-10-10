import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const DEFAULT_BACKEND_URL = 'https://hart-saver-scale-retain.trycloudflare.com/api/v1';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function handler(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  try {
    let backendBase = (process.env.BACKEND_URL || DEFAULT_BACKEND_URL).trim();
    // Cloudflare Workers restricts outbound HTTP/non-standard ports; ensure HTTPS
    if (backendBase.startsWith('http://')) {
      backendBase = DEFAULT_BACKEND_URL;
    }
    backendBase = backendBase.replace(/\/+$/, '');

    let path = '';
    if (params) {
      try {
        const resolved = (typeof (params as any)?.then === 'function' ? await params : params) as { path?: string[] };
        if (resolved && Array.isArray(resolved.path)) {
          path = resolved.path.join('/');
        }
      } catch (e) {
        // ignore param resolution failure and fallback to pathname
      }
    }

    if (!path) {
      path = request.nextUrl.pathname.replace(/^\/api\/v1\/?/, '');
    }

    const search = request.nextUrl.search || '';
    const targetUrl = `${backendBase}/${path}${search}`;

    const headers: Record<string, string> = {};
    const ALLOWED_HEADERS = ['authorization', 'content-type', 'accept', 'accept-language', 'cache-control', 'pragma'];
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (ALLOWED_HEADERS.includes(lowerKey)) {
        headers[lowerKey] = value;
      }
    });

    const method = request.method;
    let body: string | undefined = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      body = await request.text();
    }

    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const responseBody = await backendResponse.text();

    const responseHeaders: Record<string, string> = {
      'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    };

    const setCookie = backendResponse.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders['Set-Cookie'] = setCookie;
    }

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Edge proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Unable to connect to backend server: ' + (error?.message || 'Network error'),
      },
      { status: 502 }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };

