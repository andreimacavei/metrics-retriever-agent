import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const modelId = process.env.ELEVENLABS_STT_MODEL_ID ?? 'scribe_v2';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing ELEVENLABS_API_KEY' },
      { status: 500 }
    );
  }

  try {
    const audioBuffer = Buffer.from(await req.arrayBuffer());

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([audioBuffer], { type: 'audio/webm' }),
      'audio.webm'
    );
    formData.append('model_id', modelId);

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        Accept: 'application/json'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Error transcribing audio', detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text =
      data?.text ??
      data?.transcript ??
      data?.transcription ??
      '';

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Error transcribing audio' },
      { status: 500 }
    );
  }
}

