// Clerk webhook - temporarily disabled to prevent authentication issues
// This can be re-enabled later when needed for user management

export async function POST(_req: Request) {
  // Webhook temporarily disabled for development
  console.log('Clerk webhook called but disabled');
  return new Response('Webhook disabled for development', { status: 200 });
}

export async function GET(_req: Request) {
  return new Response('Clerk webhook endpoint', { status: 200 });
}