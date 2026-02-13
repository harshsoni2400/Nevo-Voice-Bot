import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, SYSTEM_PROMPT, executeTool } from '@/lib/tools';
import { buildContext } from '@/lib/knowledge-base';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * POST /api/chat
 * Sends user message to Claude with RAG context and tool calling.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      language = 'en',
    }: {
      message: string;
      conversationHistory: ConversationMessage[];
      language: string;
    } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    // Build RAG context from knowledge base
    const ragContext = buildContext(message);

    // Build the augmented system prompt
    const augmentedSystem = `${SYSTEM_PROMPT}

## CURRENT LANGUAGE
The user is speaking in: ${language === 'hi' ? 'Hindi' : 'English'}. Respond in the same language.
${language === 'hi' ? 'Respond in Hindi (Devanagari script). Use simple Hindi that is easy to understand.' : ''}

## RELEVANT KNOWLEDGE BASE CONTEXT
The following information from NYVO's knowledge base may be relevant to the user's query. Use this to provide accurate answers:

${ragContext || 'No specific context found — use your general insurance knowledge and available tools.'}`;

    // Build messages array with conversation history
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history (last 10 messages for context window management)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude with tools — keep max_tokens low for voice brevity
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: augmentedSystem,
      tools: TOOLS,
      messages,
    });

    // Handle tool use loop (max 5 iterations)
    let iterations = 0;
    const maxIterations = 5;

    while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++;

      // Extract tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      // Execute each tool
      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
        (toolUse) => ({
          type: 'tool_result' as const,
          tool_use_id: toolUse.id,
          content: executeTool(toolUse.name, toolUse.input as Record<string, unknown>),
        })
      );

      // Add assistant response and tool results to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });
      messages.push({
        role: 'user',
        content: toolResults,
      });

      // Call Claude again with tool results
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: augmentedSystem,
        tools: TOOLS,
        messages,
      });
    }

    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const assistantMessage = textBlocks.map((b) => b.text).join('\n');

    // Extract any booking URLs from tool results
    let bookingUrl: string | null = null;
    for (const block of response.content) {
      if (block.type === 'text' && block.text.includes('bookingUrl')) {
        try {
          const match = block.text.match(/"bookingUrl":\s*"([^"]+)"/);
          if (match) bookingUrl = match[1];
        } catch { /* ignore */ }
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      bookingUrl,
      toolsUsed: response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map((b) => b.name),
    });
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Chat failed', details: errorMessage },
      { status: 500 }
    );
  }
}
