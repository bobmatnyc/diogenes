import type { NextRequest } from 'next/server';
import { type DelegationConfig, orchestrateHybridResponse } from '@/lib/agents/delegation-handler-edge';
import {
  createAntiSycophancyTransform
} from '@/lib/ai/anti-sycophancy-edge';
import { createStreamingResponse, openRouterToStream } from '@/lib/ai/streaming-fix';
import { DEFAULT_MODEL, getOpenRouterClient } from '@/lib/openrouter';
import {
  composePersonalityPrompt,
  getAntiSycophancyLevel,
  type PersonalityType
} from '@/lib/personality/composer';
import { getVersionHeaders } from '@/lib/version';
import { validateEnvironmentEdge } from '@/lib/env-edge';
import { estimateMessagesTokens } from '@/lib/tokens-edge';

// Validate environment on module load (Edge-compatible version)
validateEnvironmentEdge();

// Explicitly set edge runtime for Vercel streaming
export const runtime = 'edge';

// Edge runtime configuration
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East by default, adjust as needed
};

// Create personalized prompt using the new layered architecture
function createPersonalizedPrompt(
  firstName: string,
  personality: PersonalityType = 'executive',
  memoryContext?: string,
  debugMode?: boolean
): string {
  return composePersonalityPrompt({
    personality,
    mode: 'minimal', // Use minimal mode for Edge Runtime
    antiSycophancyLevel: getAntiSycophancyLevel(personality),
    memoryContext,
    debugMode
  });
}

/**
 * TEST-ONLY Chat API endpoint that bypasses Clerk authentication
 * This endpoint is only for e2e testing and should not be used in production
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development/test mode
    if (process.env.NODE_ENV === 'production') {
      return new Response(JSON.stringify({ error: 'Test endpoint not available in production' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { messages, persona = 'diogenes', userName = 'Friend', stream = false, testMode = false } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Map persona to personality type
    const personalityMap: Record<string, PersonalityType> = {
      diogenes: 'diogenes',
      bob: 'bob',
      assistant: 'executive',
      robot: 'robot'
    };

    const personality = personalityMap[persona] || 'diogenes';

    // Create system prompt
    const systemPrompt = createPersonalizedPrompt(userName, personality);

    // Add system message to the beginning
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // If test mode with mock response, return immediately
    if (testMode) {
      const mockResponse = generateMockResponse(personality, messages[messages.length - 1]?.content, userName);

      if (stream) {
        // Return as streaming response
        const chunks = mockResponse.split(' ').map(word => `data: ${JSON.stringify({ content: word + ' ' })}\n\n`);
        chunks.push('data: [DONE]\n\n');

        return new Response(chunks.join(''), {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      } else {
        return new Response(JSON.stringify({ content: mockResponse }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // For real API calls, use OpenRouter
    const openrouter = getOpenRouterClient();

    const response = await openrouter.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: fullMessages,
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    });

    // Convert OpenRouter stream to web stream
    const webStream = openRouterToStream(response);

    // Apply anti-sycophancy transform
    const antiSycophancyLevel = getAntiSycophancyLevel(personality);
    const transformedStream = webStream.pipeThrough(
      createAntiSycophancyTransform(antiSycophancyLevel)
    );

    // Return streaming response
    return createStreamingResponse(transformedStream, {
      ...getVersionHeaders(),
      'X-Persona': persona,
      'X-Test-Mode': 'true'
    });

  } catch (error) {
    console.error('Test chat API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Generate mock responses for testing
function generateMockResponse(personality: PersonalityType, userMessage: string, userName?: string): string {
  const responses: Record<PersonalityType, (msg: string, name?: string) => string> = {
    diogenes: (msg, name) => {
      if (msg.toLowerCase().includes('social media')) {
        return `${name ? `${name}, ` : ''}imagine social media as a digital cave where shadows dance on the walls. We mistake these fleeting images for reality itself. Each "like" is but a mirror reflecting our vanity back at us.`;
      }
      return `${name ? `${name}, ` : ''}ah, you seek wisdom about "${msg}"? Perhaps the real question is why you think you need to ask. True understanding comes from questioning the question itself.`;
    },

    bob: (msg, name) => `Hey ${name || 'there'}! About "${msg}" - this is actually a common challenge in Silicon Valley. Let me share some practical insights from my experience at tech companies.`,

    executive: (msg, name) => `Certainly, ${name || 'I'} would be pleased to assist you with "${msg}". Let me organize this efficiently and provide you with a structured approach.`,

    robot: (msg, name) => `${name ? `Acknowledged, ${name}. ` : ''}Processing query: "${msg}". Analyzing parameters and generating systematic response. Step 1: Data collection initiated.`
  };

  return responses[personality]?.(userMessage, userName) || `Response regarding: ${userMessage}`;
}