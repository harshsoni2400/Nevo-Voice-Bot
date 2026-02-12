import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/synthesize
 * Converts text to speech using ElevenLabs API.
 * Returns audio as a stream.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const { text, language = 'en' } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Voice selection — using custom NYVO voice
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'm5qndnI7u4OAdXhH0Mr5';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: language === 'hi' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', errorText);
      return NextResponse.json(
        { error: 'Speech synthesis failed', details: errorText },
        { status: response.status }
      );
    }

    // Stream the audio response
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Synthesize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
