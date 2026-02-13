'use client';

import { useState, useRef, useCallback } from 'react';
import { Phone, Shield, Info } from 'lucide-react';
import VoiceButton from '@/components/VoiceButton';
import ChatHistory from '@/components/ChatHistory';
import LanguageToggle from '@/components/LanguageToggle';
import SuggestedQuestions from '@/components/SuggestedQuestions';
import TextInput from '@/components/TextInput';
import type { AgentStatus, Language, ChatMessage } from '@/lib/types';

export default function VoiceAgentPage() {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // ─── Stop any playing audio ─────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
  }, []);

  // ─── Interrupt speaking & start listening ───────────────
  const interruptAndListen = useCallback(async () => {
    stopAudio();
    setStatus('idle');
    // Small delay then start recording
    setTimeout(() => {
      startRecordingFn();
    }, 200);
  }, []);

  // ─── Start Recording ──────────────────────────────────
  const startRecordingFn = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          await processAudio(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setStatus('listening');
    } catch (error) {
      console.error('Microphone access error:', error);
      setStatus('error');
      addMessage('assistant', language === 'hi'
        ? 'माइक्रोफ़ोन एक्सेस नहीं मिला। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।'
        : 'Could not access microphone. Please allow microphone permission in your browser settings.'
      );
    }
  };

  const startRecording = useCallback(async () => {
    await startRecordingFn();
  }, [language]);

  // ─── Stop Recording ───────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setStatus('processing');
    }
  }, []);

  // ─── Process Audio Pipeline ───────────────────────────
  const processAudio = async (audioBlob: Blob) => {
    try {
      // Step 1: Transcribe with Deepgram
      setStatus('processing');
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', language);

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');
      const { transcript, language: detectedLang } = await transcribeRes.json();

      if (!transcript || transcript.trim() === '') {
        setStatus('idle');
        addMessage('assistant', language === 'hi'
          ? 'मुझे कुछ सुनाई नहीं दिया। कृपया फिर से बोलें।'
          : "I didn't catch that. Please try speaking again."
        );
        return;
      }

      // Update language if auto-detected
      if (detectedLang === 'hi' && language !== 'hi') {
        setLanguage('hi');
      }

      // Add user message
      addMessage('user', transcript);

      // Step 2: Chat with Claude
      await sendToChat(transcript);
    } catch (error) {
      console.error('Audio processing error:', error);
      setStatus('error');
      addMessage('assistant', 'Something went wrong. Please try again.');
    }
  };

  // ─── Send Text to Chat API ────────────────────────────
  const sendToChat = async (text: string) => {
    try {
      setStatus('thinking');
      setIsThinking(true);

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          language,
        }),
      });

      if (!chatRes.ok) throw new Error('Chat failed');
      const { message: reply } = await chatRes.json();

      setIsThinking(false);
      addMessage('assistant', reply);

      // Step 3: Synthesize speech with ElevenLabs
      await synthesizeSpeech(reply);
    } catch (error) {
      console.error('Chat error:', error);
      setIsThinking(false);
      setStatus('error');
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
  };

  // ─── Synthesize Speech ────────────────────────────────
  const synthesizeSpeech = async (text: string) => {
    try {
      setStatus('speaking');

      // Truncate for TTS if too long
      const ttsText = text.length > 800 ? text.substring(0, 800) + '...' : text;

      const synthRes = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, language }),
      });

      if (!synthRes.ok) {
        console.warn('TTS failed, skipping audio playback');
        setStatus('idle');
        return;
      }

      const audioBlob = await synthRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Stop any existing audio
      stopAudio();

      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioPlayerRef.current = null;
        // Auto-transition to idle — user can tap to speak again
        setStatus('idle');
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioPlayerRef.current = null;
        setStatus('idle');
      };

      await audio.play();
    } catch (error) {
      console.warn('Speech synthesis error:', error);
      setStatus('idle');
    }
  };

  // ─── Handle Text Input ────────────────────────────────
  const handleTextInput = async (text: string) => {
    addMessage('user', text);
    await sendToChat(text);
  };

  // ─── Handle Suggested Question ────────────────────────
  const handleSuggestion = async (question: string) => {
    addMessage('user', question);
    await sendToChat(question);
  };

  // ─── Add Message Helper ───────────────────────────────
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      role,
      content,
      timestamp: Date.now(),
      language,
    };
    setMessages((prev) => [...prev, msg]);
  };

  const isProcessing = ['processing', 'thinking', 'speaking'].includes(status);
  const showSuggestions = messages.length === 0 && status === 'idle';

  return (
    <div className="min-h-screen flex flex-col bg-nyvo-dark">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-nyvo-blue flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">NYVO</h1>
            <p className="text-[10px] text-nyvo-muted">Insurance Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle language={language} onChange={setLanguage} />
          <a
            href="tel:+919900091495"
            className="p-2 rounded-full bg-green-500/10 hover:bg-green-500/20 transition-colors"
            title="Call NYVO"
          >
            <Phone className="w-4 h-4 text-green-400" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Welcome message when no chats */}
        {messages.length === 0 && (
          <div className="flex-shrink-0 text-center pt-8 pb-4 px-6">
            <h2 className="text-2xl font-bold gradient-text mb-2">
              {language === 'hi' ? 'नमस्ते!' : 'Hello!'}
            </h2>
            <p className="text-sm text-nyvo-muted max-w-sm mx-auto">
              {language === 'hi'
                ? 'मैं NYVO का AI असिस्टेंट हूँ। हेल्थ इंश्योरेंस, टर्म इंश्योरेंस, क्लेम, या किसी भी बीमा सवाल के लिए मुझसे पूछें।'
                : "I'm NYVO's AI assistant. Ask me about health insurance, term insurance, claims, or any insurance question."}
            </p>
          </div>
        )}

        {/* Suggested Questions */}
        <SuggestedQuestions
          language={language}
          onSelect={handleSuggestion}
          visible={showSuggestions}
        />

        {/* Chat History */}
        <ChatHistory messages={messages} isThinking={isThinking} />

        {/* Bottom Section */}
        <div className="flex-shrink-0 px-4 pb-6 pt-4 space-y-4 border-t border-white/5 bg-nyvo-dark">
          {/* Voice Button */}
          <div className="flex justify-center">
            <VoiceButton
              status={status}
              onStart={startRecording}
              onStop={stopRecording}
              onInterrupt={interruptAndListen}
            />
          </div>

          {/* Text Input (fallback) */}
          <TextInput
            onSend={handleTextInput}
            disabled={isProcessing}
            placeholder={
              language === 'hi'
                ? 'अपना सवाल टाइप करें...'
                : 'Type your question...'
            }
          />

          {/* Footer info */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-nyvo-muted/60">
            <Info className="w-3 h-3" />
            <span>IRDAI Certified | NYVO Insurance Services LLP</span>
          </div>
        </div>
      </main>
    </div>
  );
}
