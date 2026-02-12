'use client';

import { useEffect, useRef } from 'react';
import { User, Bot, ExternalLink } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isThinking: boolean;
}

export default function ChatHistory({ messages, isThinking }: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return null;
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[50vh]"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 animate-fade-in-up ${
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {msg.role === 'assistant' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nyvo-blue/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-nyvo-blue" />
            </div>
          )}

          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-nyvo-blue text-white rounded-br-md'
                : 'bg-nyvo-navy border border-white/5 text-slate-200 rounded-bl-md'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </p>

            {/* Booking link if present */}
            {msg.role === 'assistant' && msg.content.includes('book') && (
              <BookingCTA />
            )}
          </div>

          {msg.role === 'user' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-300" />
            </div>
          )}
        </div>
      ))}

      {/* Thinking indicator */}
      {isThinking && (
        <div className="flex gap-3 items-start animate-fade-in-up">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nyvo-blue/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-nyvo-blue" />
          </div>
          <div className="bg-nyvo-navy border border-white/5 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1.5">
              <span className="typing-dot w-2 h-2 rounded-full bg-nyvo-blue" />
              <span className="typing-dot w-2 h-2 rounded-full bg-nyvo-blue" />
              <span className="typing-dot w-2 h-2 rounded-full bg-nyvo-blue" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCTA() {
  const bookingUrl =
    process.env.NEXT_PUBLIC_BOOKING_URL ||
    'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0ORrvJhRP3kGcmYIOl5S_BZfb45n3aex1Lt-Yew3wXTkjLhEBhJsJm1bD0BQFH7FZbpKX69Ci';

  return (
    <a
      href={bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center gap-2 bg-nyvo-blue/20 hover:bg-nyvo-blue/30 text-nyvo-blue px-3 py-2 rounded-lg text-xs font-medium transition-colors"
    >
      <ExternalLink className="w-3 h-3" />
      Book Free Consultation
    </a>
  );
}
