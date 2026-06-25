import { NextResponse } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// Server-side proxy: keeps the backend URL off the client and avoids relying on CORS.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(body as object), source: 'web-form' }),
    });

    const text = await upstream.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: 'We could not reach our dispatch service. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
