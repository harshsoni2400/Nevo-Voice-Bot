import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        nyvo: {
          blue: '#3C83F6',
          dark: '#0A1628',
          navy: '#111B2E',
          slate: '#1E293B',
          muted: '#94A3B8',
          light: '#F1F5F9',
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'sound-wave': 'sound-wave 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'sound-wave': {
          '0%': { height: '4px' },
          '100%': { height: '24px' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
