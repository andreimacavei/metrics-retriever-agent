import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text, voice_id } = await req.json();
  const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ELEVENLABS_API_KEY' }, { status: 500 });
  }

  const requestBody = JSON.stringify({
    text,
    model_id: 'eleven_monolingual_v1'
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Error generating text-to-speech' }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(Buffer.from(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg'
      }
    });
  } catch (error) {
    console.error('Error generating text-to-speech:', error);
    return NextResponse.json({ error: 'Error generating text-to-speech' }, { status: 500 });
  }
}