import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/transcribe
 * Sends audio to Deepgram for speech-to-text transcription.
 * Supports English and Hindi.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const language = (formData.get('language') as string) || 'en';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Deepgram API - pre-recorded transcription
    const deepgramUrl = new URL('https://api.deepgram.com/v1/listen');
    deepgramUrl.searchParams.set('model', 'nova-2');
    deepgramUrl.searchParams.set('smart_format', 'true');
    deepgramUrl.searchParams.set('punctuate', 'true');

    // Language config
    if (language === 'hi') {
      deepgramUrl.searchParams.set('language', 'hi');
    } else {
      // Multi-language detection for EN + HI
      deepgramUrl.searchParams.set('language', 'en');
      deepgramUrl.searchParams.set('detect_language', 'true');
    }

    const response = await fetch(deepgramUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'audio/webm',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram error:', errorText);
      return NextResponse.json(
        { error: 'Transcription failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const detectedLanguage =
      result?.results?.channels?.[0]?.detected_language || language;
    const confidence =
      result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

    return NextResponse.json({
      transcript,
      language: detectedLanguage,
      confidence,
    });
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
