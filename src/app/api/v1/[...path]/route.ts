import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const BACKEND_URL = process.env.BACKEND_URL || 'http://129.225.66.117.nip.io:8080/api/v1';

async function handler(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  try {
    const resolvedParams = (await params.catch(() => ({}))) as { path?: string[] };
    const path =
      resolvedParams?.path && Array.isArray(resolvedParams.path)
        ? resolvedParams.path.join('/')
        : request.nextUrl.pathname.replace(/^\/api\/v1\/?/, '');
    const search = request.nextUrl.search;
    const targetUrl = `${BACKEND_URL}/${path}${search}`;

    const headers: Record<string, string> = {};

    // Forward necessary client headers, excluding forbidden and internal headers
    const ALLOWED_HEADERS = ['authorization', 'content-type', 'accept', 'accept-language', 'cache-control', 'pragma'];
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (ALLOWED_HEADERS.includes(lowerKey)) {
        headers[lowerKey] = value;
      }
    });

    const method = request.method;
    let body: BodyInit | null = null;
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
    };

    const setCookie = backendResponse.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders['Set-Cookie'] = setCookie;
    }

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
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

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH, handler as OPTIONS };
