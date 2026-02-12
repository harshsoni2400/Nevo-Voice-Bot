'use client';

import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import type { AgentStatus } from '@/lib/types';

interface VoiceButtonProps {
  status: AgentStatus;
  onStart: () => void;
  onStop: () => void;
}

export default function VoiceButton({ status, onStart, onStop }: VoiceButtonProps) {
  const isListening = status === 'listening';
  const isProcessing = status === 'processing' || status === 'thinking';
  const isSpeaking = status === 'speaking';
  const isActive = isListening || isProcessing || isSpeaking;

  const handleClick = () => {
    if (isListening) {
      onStop();
    } else if (status === 'idle' || status === 'error') {
      onStart();
    }
  };

  const getIcon = () => {
    if (isProcessing) return <Loader2 className="w-8 h-8 animate-spin" />;
    if (isSpeaking) return <Volume2 className="w-8 h-8" />;
    if (isListening) return <MicOff className="w-8 h-8" />;
    return <Mic className="w-8 h-8" />;
  };

  const getLabel = () => {
    switch (status) {
      case 'listening': return 'Listening... Tap to stop';
      case 'processing': return 'Transcribing...';
      case 'thinking': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      case 'error': return 'Tap to try again';
      default: return 'Tap to speak';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Waveform visualization when listening */}
      {isListening && (
        <div className="flex items-center gap-1 h-8">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-nyvo-blue rounded-full wave-bar"
              style={{
                animationDelay: `${i * 0.15}s`,
                minHeight: '4px',
              }}
            />
          ))}
        </div>
      )}

      {/* Main button */}
      <button
        onClick={handleClick}
        disabled={isProcessing || isSpeaking}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 ease-out
          ${isListening
            ? 'bg-red-500 hover:bg-red-600 mic-pulsing scale-110'
            : isProcessing || isSpeaking
              ? 'bg-nyvo-blue/50 cursor-not-allowed'
              : 'bg-nyvo-blue hover:bg-blue-500 hover:scale-105 active:scale-95'
          }
          ${status === 'error' ? 'bg-red-500/70 hover:bg-red-500' : ''}
          disabled:opacity-70
          shadow-lg shadow-nyvo-blue/25
        `}
      >
        {/* Pulse rings when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
            <span className="absolute inset-[-8px] rounded-full border-2 border-red-400/30 animate-pulse" />
          </>
        )}

        {/* Speaking animation rings */}
        {isSpeaking && (
          <>
            <span className="absolute inset-[-4px] rounded-full border-2 border-nyvo-blue/40 animate-pulse" />
            <span className="absolute inset-[-10px] rounded-full border border-nyvo-blue/20 animate-pulse" style={{ animationDelay: '0.3s' }} />
          </>
        )}

        <span className="relative z-10 text-white">{getIcon()}</span>
      </button>

      {/* Status label */}
      <p className="text-sm text-nyvo-muted animate-fade-in-up">{getLabel()}</p>
    </div>
  );
}
