import { NextRequest, NextResponse } from 'next/server';

// This catches Clerk's internal requests and handles them appropriately
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';
  
  // Handle Clerk health checks
  if (path.includes('_clerk_catchall_check_')) {
    return new NextResponse('OK', { status: 200 });
  }
  
  // Handle SSO callback redirects
  if (path.includes('sso-callback')) {
    const url = new URL('/login/sso-callback', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }
  
  // Handle Clerk verification flows
  if (path.includes('verify-email-address') || 
      path.includes('verify-phone-number') ||
      path.includes('verify') ||
      path.includes('forgot-password') ||
      path.includes('reset-password')) {
    // Redirect to main login page with the verification flow
    const url = new URL('/login', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }
  
  // Handle other Clerk flows
  if (path.includes('continue') || 
      path.includes('factor-one') ||
      path.includes('factor-two') ||
      path.includes('choose-strategy')) {
    const url = new URL('/login', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }
  
  // For other requests, return 404
  return new NextResponse('Not Found', { status: 404 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';
  
  // Handle Clerk health checks
  if (path.includes('_clerk_catchall_check_')) {
    return new NextResponse('OK', { status: 200 });
  }
  
  // Handle Clerk verification flows (POST requests)
  if (path.includes('verify-email-address') || 
      path.includes('verify-phone-number') ||
      path.includes('verify') ||
      path.includes('forgot-password') ||
      path.includes('reset-password')) {
    // Redirect to main login page with the verification flow
    const url = new URL('/login', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 307); // Use 307 to preserve POST method
  }
  
  // Handle other Clerk flows (POST requests)
  if (path.includes('continue') || 
      path.includes('factor-one') ||
      path.includes('factor-two') ||
      path.includes('choose-strategy')) {
    const url = new URL('/login', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 307);
  }
  
  // For other requests, return 404
  return new NextResponse('Not Found', { status: 404 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';
  
  // Handle Clerk flows that use PUT
  if (path.includes('verify') || path.includes('continue') || path.includes('factor')) {
    const url = new URL('/login', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 307);
  }
  
  return new NextResponse('Not Found', { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';
  
  // Handle Clerk flows that use PATCH
  if (path.includes('verify') || path.includes('continue') || path.includes('factor')) {
    const url = new URL('/login', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 307);
  }
  
  return new NextResponse('Not Found', { status: 404 });
}
