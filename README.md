# NYVO Voice Insurance Agent

AI-powered voice assistant for insurance queries. Built with Next.js, Claude API, Deepgram, and ElevenLabs.

## Features

- **Voice Q&A** — Ask insurance questions by speaking (English + Hindi)
- **51 Policy Database** — Compare policies across 56 insurers
- **Coverage Calculators** — Health and Term insurance coverage calculators
- **Claims Guidance** — Step-by-step help for cashless, reimbursement, and death claims
- **Book Consultations** — Instant booking link for NYVO expert advisors

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Then add your API keys to .env.local

# 3. Build knowledge base & start dev server
npm run build:kb
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required API Keys

| Service | Purpose | Get Key |
|---------|---------|---------|
| Anthropic Claude | AI reasoning engine | [console.anthropic.com](https://console.anthropic.com) |
| Deepgram | Speech-to-Text (EN + HI) | [console.deepgram.com](https://console.deepgram.com) |
| ElevenLabs | Text-to-Speech | [elevenlabs.io](https://elevenlabs.io) |

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Architecture

```
User speaks → Deepgram STT → Claude API (+ RAG context) → ElevenLabs TTS → Audio playback
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **AI:** Claude API with tool calling
- **STT:** Deepgram Nova-2
- **TTS:** ElevenLabs Multilingual v2
- **Styling:** Tailwind CSS
- **Knowledge Base:** 54 articles, 51 policies, 56 insurers

## Project Structure

```
voice-agent/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main voice agent UI
│   │   └── api/
│   │       ├── transcribe/       # Deepgram STT endpoint
│   │       ├── chat/             # Claude + RAG endpoint
│   │       └── synthesize/       # ElevenLabs TTS endpoint
│   ├── components/               # React components
│   ├── lib/
│   │   ├── knowledge-base.ts    # RAG search logic
│   │   ├── tools.ts             # Claude tool definitions
│   │   ├── calculator.ts        # Insurance calculators
│   │   └── types.ts             # TypeScript types
│   └── data/
│       └── knowledge-base.json  # Pre-built KB (generated)
├── scripts/
│   └── build-knowledge-base.js  # KB builder script
└── vercel.json                  # Deployment config
```

---

Built by [NYVO Insurance Services LLP](https://nyvo.in)
