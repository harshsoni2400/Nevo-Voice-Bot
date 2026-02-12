'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface TextInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export default function TextInput({ onSend, disabled, placeholder }: TextInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 bg-nyvo-navy border border-white/10 rounded-full px-4 py-2">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || 'Type your question...'}
        className="flex-1 bg-transparent text-sm text-white placeholder-nyvo-muted
          outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="p-2 rounded-full bg-nyvo-blue hover:bg-blue-500
          disabled:bg-slate-700 disabled:opacity-50
          transition-colors duration-200"
      >
        <Send className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}
