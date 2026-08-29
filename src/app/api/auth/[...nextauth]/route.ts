import { NextRequest } from 'next/server'

export async function GET(_request: NextRequest) {
  return new Response('OK', { status: 200 })
}

export async function POST(_request: NextRequest) {
  return new Response('OK', { status: 200 })
}
