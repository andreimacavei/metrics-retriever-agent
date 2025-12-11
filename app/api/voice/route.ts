import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = 'https://api.elevenlabs.io/v1/voices';
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ELEVENLABS_API_KEY' }, { status: 500 });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Error fetching voices' }, { status: response.status });
    }

    const voices = await response.json();
    return NextResponse.json(voices);
  } catch {
    return NextResponse.json({ error: 'Error fetching voices' }, { status: 500 });
  }
}