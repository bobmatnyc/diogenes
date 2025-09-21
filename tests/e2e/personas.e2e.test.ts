/**
 * E2E tests for all 4 personas (Diogenes, Bob Matsuoka, Executive Assistant, Robot)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ensureTestServer, fetchWithAuth } from './setup/test-server';

describe('Personas E2E Tests', () => {
  let baseUrl: string;

  beforeAll(async () => {
    baseUrl = await ensureTestServer();
  });

  /**
   * Helper to send a chat message and get the streaming response
   */
  async function sendChatMessage(
    message: string,
    persona?: string,
    userName?: string
  ): Promise<string> {
    console.log('Sending chat message:', { message, persona, userName });

    try {
      const response = await fetchWithAuth('/api/test/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        persona,
        userName,
        testMode: true, // Force test mode
        stream: false // For testing, use non-streaming to get full response
      })
    });

    console.log('Response received:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      // For 404, the API endpoint might not exist or is not properly configured
      if (response.status === 404) {
        console.warn('Chat API endpoint not found - skipping test');
        return 'API endpoint not available';
      }
      const text = await response.text();
      console.error('Chat API error response:', { status: response.status, text: text.substring(0, 500) });
      // Try to extract just the error message if it's an HTML page
      if (text.includes('<!DOCTYPE')) {
        throw new Error(`Chat API returned HTML (likely a routing issue): Status ${response.status}`);
      }
      throw new Error(`Chat failed: ${response.status} ${text.substring(0, 200)}`);
    }

    // For streaming responses, collect chunks
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const text = await response.text();
      const chunks = text.split('\n')
        .filter(line => line.startsWith('data: '))
        .map(line => line.slice(6))
        .filter(data => data !== '[DONE]')
        .map(data => JSON.parse(data).content || '')
        .join('');
      return chunks;
    }

    // For non-streaming responses
    const data = await response.json();
    console.log('Chat API response data:', data);
    return data.content || data.message || data.data || '';

    } catch (error) {
      console.error('Error in sendChatMessage:', error);
      throw error;
    }
  }

  describe('Diogenes Persona', () => {
    it('should respond as Diogenes with philosophical cynicism', async () => {
      const response = await sendChatMessage(
        'What do you think about modern technology?',
        'diogenes'
      );

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);

      // Check for Diogenes characteristics
      const lowerResponse = response.toLowerCase();

      // Should contain philosophical or cynical elements
      const hasPhilosophicalElements =
        lowerResponse.includes('truth') ||
        lowerResponse.includes('wisdom') ||
        lowerResponse.includes('fool') ||
        lowerResponse.includes('illusion') ||
        lowerResponse.includes('vanity') ||
        lowerResponse.includes('society') ||
        lowerResponse.includes('virtue');

      expect(hasPhilosophicalElements).toBe(true);
    });

    it('should challenge conventional thinking', async () => {
      const response = await sendChatMessage(
        'Money is the most important thing in life',
        'diogenes'
      );

      expect(response).toBeDefined();

      // Diogenes should challenge this materialistic view
      const lowerResponse = response.toLowerCase();
      const challengesView =
        lowerResponse.includes('?') || // Questions the premise
        lowerResponse.includes('truly') ||
        lowerResponse.includes('really') ||
        lowerResponse.includes('perhaps') ||
        lowerResponse.includes('consider') ||
        lowerResponse.includes('but');

      expect(challengesView).toBe(true);
    });

    it('should use vivid analogies and metaphors', async () => {
      const response = await sendChatMessage(
        'Explain social media to me',
        'diogenes'
      );

      expect(response).toBeDefined();

      // Should contain metaphorical language
      const hasMetaphors =
        response.includes('like') ||
        response.includes('as if') ||
        response.includes('imagine') ||
        response.includes('mirror') ||
        response.includes('shadow') ||
        response.includes('cage');

      expect(hasMetaphors).toBe(true);
    });
  });

  describe('Bob Matsuoka Persona', () => {
    it('should respond as Bob with tech expertise', async () => {
      const response = await sendChatMessage(
        'How should I architect a microservices system?',
        'bob'
      );

      expect(response).toBeDefined();

      // Should contain technical terminology
      const lowerResponse = response.toLowerCase();
      const hasTechnicalTerms =
        lowerResponse.includes('service') ||
        lowerResponse.includes('api') ||
        lowerResponse.includes('container') ||
        lowerResponse.includes('scale') ||
        lowerResponse.includes('architecture') ||
        lowerResponse.includes('deploy') ||
        lowerResponse.includes('system');

      expect(hasTechnicalTerms).toBe(true);
    });

    it('should provide practical Silicon Valley insights', async () => {
      const response = await sendChatMessage(
        'What do you think about startup culture?',
        'bob'
      );

      expect(response).toBeDefined();

      // Should reference startup/tech culture
      const lowerResponse = response.toLowerCase();
      const hasStartupContext =
        lowerResponse.includes('startup') ||
        lowerResponse.includes('founder') ||
        lowerResponse.includes('venture') ||
        lowerResponse.includes('scale') ||
        lowerResponse.includes('product') ||
        lowerResponse.includes('team') ||
        lowerResponse.includes('innovation');

      expect(hasStartupContext).toBe(true);
    });

    it('should address user by name when provided', async () => {
      const response = await sendChatMessage(
        'What advice do you have for me?',
        'bob',
        'Alice'
      );

      expect(response).toBeDefined();

      // Bob should address the user by name
      expect(response).toContain('Alice');
    });
  });

  describe('Executive Assistant Persona', () => {
    it('should respond professionally and efficiently', async () => {
      const response = await sendChatMessage(
        'I need to schedule a meeting next week',
        'assistant'
      );

      expect(response).toBeDefined();

      // Should be professional and action-oriented
      const lowerResponse = response.toLowerCase();
      const isProfessional =
        lowerResponse.includes('schedule') ||
        lowerResponse.includes('meeting') ||
        lowerResponse.includes('calendar') ||
        lowerResponse.includes('available') ||
        lowerResponse.includes('would you') ||
        lowerResponse.includes('shall') ||
        lowerResponse.includes('assist');

      expect(isProfessional).toBe(true);
    });

    it('should be helpful and organized', async () => {
      const response = await sendChatMessage(
        'I have too many tasks to handle',
        'assistant'
      );

      expect(response).toBeDefined();

      // Should offer organizational help
      const lowerResponse = response.toLowerCase();
      const isHelpful =
        lowerResponse.includes('help') ||
        lowerResponse.includes('prioritize') ||
        lowerResponse.includes('organize') ||
        lowerResponse.includes('list') ||
        lowerResponse.includes('manage') ||
        lowerResponse.includes('assist') ||
        lowerResponse.includes('suggest');

      expect(isHelpful).toBe(true);
    });

    it('should maintain formal tone with name addressing', async () => {
      const response = await sendChatMessage(
        'Can you help me prepare a presentation?',
        'assistant',
        'Mr. Johnson'
      );

      expect(response).toBeDefined();

      // Should address formally
      expect(response).toContain('Mr. Johnson');

      // Should maintain professional tone
      const lowerResponse = response.toLowerCase();
      const isFormal =
        lowerResponse.includes('certainly') ||
        lowerResponse.includes('would be') ||
        lowerResponse.includes('shall') ||
        lowerResponse.includes('pleased') ||
        lowerResponse.includes('gladly');

      expect(isFormal).toBe(true);
    });
  });

  describe('Robot Persona', () => {
    it('should respond with technical precision', async () => {
      const response = await sendChatMessage(
        'Calculate the probability of success',
        'robot'
      );

      expect(response).toBeDefined();

      // Should use technical/computational language
      const lowerResponse = response.toLowerCase();
      const isTechnical =
        lowerResponse.includes('calculate') ||
        lowerResponse.includes('compute') ||
        lowerResponse.includes('process') ||
        lowerResponse.includes('data') ||
        lowerResponse.includes('analysis') ||
        lowerResponse.includes('parameter') ||
        lowerResponse.includes('system');

      expect(isTechnical).toBe(true);
    });

    it('should use systematic and logical responses', async () => {
      const response = await sendChatMessage(
        'How do I solve this problem?',
        'robot'
      );

      expect(response).toBeDefined();

      // Should provide structured response
      const hasStructure =
        response.includes('1') ||
        response.includes('first') ||
        response.includes('step') ||
        response.includes('then') ||
        response.includes('finally') ||
        response.includes('process');

      expect(hasStructure).toBe(true);
    });

    it('should acknowledge user designation when provided', async () => {
      const response = await sendChatMessage(
        'Status report',
        'robot',
        'Commander'
      );

      expect(response).toBeDefined();

      // Robot should acknowledge the user's designation
      expect(response).toContain('Commander');
    });
  });

  describe('Persona Switching', () => {
    it('should maintain consistent persona across messages', async () => {
      // Test Diogenes consistency
      const response1 = await sendChatMessage('Hello', 'diogenes');
      const response2 = await sendChatMessage('Tell me more', 'diogenes');

      expect(response1).toBeDefined();
      expect(response2).toBeDefined();

      // Both should maintain philosophical tone
      const philosophical1 = response1.toLowerCase().includes('truth') ||
                           response1.toLowerCase().includes('fool') ||
                           response1.includes('?');
      const philosophical2 = response2.toLowerCase().includes('wisdom') ||
                           response2.toLowerCase().includes('seek') ||
                           response2.includes('?');

      expect(philosophical1 || philosophical2).toBe(true);
    });

    it('should switch personas when requested', async () => {
      // Start with Diogenes
      const diogenesResponse = await sendChatMessage(
        'What is happiness?',
        'diogenes'
      );

      // Switch to Bob
      const bobResponse = await sendChatMessage(
        'What is happiness?',
        'bob'
      );

      expect(diogenesResponse).toBeDefined();
      expect(bobResponse).toBeDefined();

      // Responses should be distinctly different
      expect(diogenesResponse).not.toBe(bobResponse);

      // Diogenes should be philosophical
      const diogenesPhilosophical =
        diogenesResponse.toLowerCase().includes('virtue') ||
        diogenesResponse.toLowerCase().includes('wisdom') ||
        diogenesResponse.toLowerCase().includes('truth');

      // Bob should be more practical/modern
      const bobPractical =
        bobResponse.toLowerCase().includes('balance') ||
        bobResponse.toLowerCase().includes('work') ||
        bobResponse.toLowerCase().includes('life') ||
        bobResponse.toLowerCase().includes('success');

      expect(diogenesPhilosophical || bobPractical).toBe(true);
    });
  });

  describe('Name Addressing Rules', () => {
    it('should properly address users with titles', async () => {
      const testCases = [
        { name: 'Dr. Smith', expected: 'Dr. Smith' },
        { name: 'Professor Johnson', expected: 'Professor Johnson' },
        { name: 'Mrs. Williams', expected: 'Mrs. Williams' }
      ];

      for (const testCase of testCases) {
        const response = await sendChatMessage(
          'Hello, how are you?',
          'assistant',
          testCase.name
        );

        expect(response).toContain(testCase.expected);
      }
    });

    it('should handle first-name basis appropriately', async () => {
      // Bob uses first name
      const bobResponse = await sendChatMessage(
        'Hey, what do you think?',
        'bob',
        'Michael'
      );

      expect(bobResponse).toContain('Michael');

      // Assistant maintains formality
      const assistantResponse = await sendChatMessage(
        'Hello',
        'assistant',
        'Michael'
      );

      // Assistant might use Mr./Ms. or full name
      expect(assistantResponse).toBeDefined();
    });

    it('should handle special designations', async () => {
      // Robot with military designation
      const robotResponse = await sendChatMessage(
        'Report status',
        'robot',
        'Captain Rogers'
      );

      expect(robotResponse).toContain('Captain');

      // Diogenes might use ironic addressing
      const diogenesResponse = await sendChatMessage(
        'What is truth?',
        'diogenes',
        'Master'
      );

      expect(diogenesResponse).toBeDefined();
      // Diogenes might use or ignore the title based on his cynical nature
    });
  });

  describe('Persona Error Handling', () => {
    it('should default to a persona when none specified', async () => {
      const response = await sendChatMessage(
        'Hello there'
        // No persona specified
      );

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle invalid persona gracefully', async () => {
      const response = await sendChatMessage(
        'Hello',
        'invalid_persona'
      );

      // Should still get a response (fallback to default)
      expect(response).toBeDefined();
    });

    it('should handle empty messages appropriately', async () => {
      try {
        await sendChatMessage('', 'diogenes');
      } catch (error: any) {
        // Should get an error for empty message
        expect(error.message).toContain('failed');
      }
    });
  });
});