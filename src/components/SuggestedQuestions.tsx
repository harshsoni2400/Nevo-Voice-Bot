'use client';

import type { Language } from '@/lib/types';

interface SuggestedQuestionsProps {
  language: Language;
  onSelect: (question: string) => void;
  visible: boolean;
}

const SUGGESTIONS = {
  en: [
    { text: 'How much health insurance do I need?', icon: '🏥' },
    { text: 'Compare Star Health vs Care Health plans', icon: '⚖️' },
    { text: 'How to file a cashless claim?', icon: '📋' },
    { text: 'What is no claim bonus?', icon: '💰' },
    { text: 'Best term insurance plans in 2026', icon: '🛡️' },
    { text: 'Tax benefits under Section 80D', icon: '📊' },
  ],
  hi: [
    { text: 'मुझे कितना हेल्थ इंश्योरेंस चाहिए?', icon: '🏥' },
    { text: 'कैशलेस क्लेम कैसे करें?', icon: '📋' },
    { text: 'नो क्लेम बोनस क्या है?', icon: '💰' },
    { text: 'सबसे अच्छा टर्म इंश्योरेंस कौन सा है?', icon: '🛡️' },
    { text: 'सेक्शन 80D के टैक्स बेनिफिट्स', icon: '📊' },
    { text: 'प्री-एक्सिस्टिंग बीमारी और बीमा', icon: '⚕️' },
  ],
};

export default function SuggestedQuestions({
  language,
  onSelect,
  visible,
}: SuggestedQuestionsProps) {
  if (!visible) return null;

  const suggestions = SUGGESTIONS[language] || SUGGESTIONS.en;

  return (
    <div className="px-4 pb-4">
      <p className="text-xs text-nyvo-muted mb-3 text-center">
        {language === 'hi' ? 'या ये पूछें:' : 'Or ask about:'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.text)}
            className="flex items-center gap-2 bg-nyvo-navy hover:bg-nyvo-slate
              border border-white/5 hover:border-nyvo-blue/30
              rounded-xl px-3 py-2.5 text-left transition-all duration-200
              hover:shadow-lg hover:shadow-nyvo-blue/5 group"
          >
            <span className="text-base flex-shrink-0">{s.icon}</span>
            <span className="text-xs text-slate-300 group-hover:text-white leading-tight line-clamp-2">
              {s.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
