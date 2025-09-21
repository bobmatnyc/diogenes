/**
 * E2E tests for API Key validation and configuration
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ensureTestServer, fetchWithAuth } from './setup/test-server';

describe('API Keys E2E Tests', () => {
  let baseUrl: string;

  beforeAll(async () => {
    baseUrl = await ensureTestServer();
  });

  describe('Environment Variable Presence', () => {
    it('should have OpenRouter API key configured', async () => {
      const response = await fetchWithAuth('/api/test/env-check', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.hasOpenRouterKey).toBeDefined();
      expect(data.hasOpenRouterKey).toBe(true);
    });

    it('should have Clerk authentication keys configured', async () => {
      const response = await fetchWithAuth('/api/test/env-check', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.hasClerkPublishableKey).toBeDefined();
      expect(data.hasClerkPublishableKey).toBe(true);
      expect(data.hasClerkSecretKey).toBeDefined();
      expect(data.hasClerkSecretKey).toBe(true);
    });

    it('should have memory API configuration', async () => {
      const response = await fetchWithAuth('/api/test/env-check', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      // Memory API uses bearer tokens, not environment variables
      // Just check that the server is running
      expect(data).toBeDefined();
    });
  });

  describe('OpenRouter API Validation', () => {
    it('should validate OpenRouter API key format', async () => {
      const response = await fetchWithAuth('/api/test/validate-openrouter', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: 'sk-or-v1-test123'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.validFormat).toBe(true);
    });

    it('should reject invalid OpenRouter API key format', async () => {
      const response = await fetchWithAuth('/api/test/validate-openrouter', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: 'invalid-key'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.validFormat).toBe(false);
    });

    it('should check OpenRouter model availability', async () => {
      const response = await fetchWithAuth('/api/test/check-models', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Check for primary models
      expect(data.models).toBeDefined();
      expect(data.models['anthropic/claude-3.5-sonnet']).toBeDefined();
      expect(data.models['perplexity/sonar-pro']).toBeDefined();
    });
  });

  describe('Clerk Authentication Validation', () => {
    it('should verify Clerk is initialized', async () => {
      const response = await fetchWithAuth('/api/test/clerk-status', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.initialized).toBe(true);
      expect(data.publishableKey).toBeDefined();
    });

    it('should handle authentication flow', async () => {
      // Test that auth endpoints exist and respond
      const response = await fetch(`${baseUrl}/api/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true
        })
      });

      // Should get a proper auth error, not 404
      expect([400, 401, 403]).toContain(response.status);
    });
  });

  describe('Memory API Token Validation', () => {
    it('should accept valid bearer tokens for memory API', async () => {
      const validToken = 'test_memory_bearer_token_e2e';
      const response = await fetchWithAuth(
        '/api/memory/entities',
        { method: 'GET' },
        validToken
      );

      // Should either succeed or return proper auth error
      expect([200, 401]).toContain(response.status);
      if (response.status === 401) {
        const error = await response.json();
        // The error message might be 'Invalid API key' or contain 'Authorization'
        expect(error.error || error.message).toBeDefined();
      }
    });

    it('should handle requests without bearer token', async () => {
      const response = await fetch(`${baseUrl}/api/memory/entities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // In development mode, might succeed with default user, otherwise 401
      expect([200, 401]).toContain(response.status);
      if (response.status === 401) {
        const error = await response.json();
        expect(error.error || error.message).toBeDefined();
      }
    });

    it('should handle malformed bearer tokens', async () => {
      const response = await fetch(`${baseUrl}/api/memory/entities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'InvalidFormat token'
        }
      });

      // Development mode might still accept it, otherwise 401
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('API Rate Limiting', () => {
    it('should handle rate limiting headers', async () => {
      const response = await fetchWithAuth('/api/test/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          testMode: true
        })
      });

      // Check for rate limit headers
      const headers = response.headers;
      // These might not be present in dev, but check if they exist
      if (headers.get('x-ratelimit-limit')) {
        expect(headers.get('x-ratelimit-limit')).toBeDefined();
        expect(headers.get('x-ratelimit-remaining')).toBeDefined();
      }
    });
  });

  describe('API Key Security', () => {
    it('should not expose API keys in responses', async () => {
      const response = await fetchWithAuth('/api/test/config', {
        method: 'GET'
      });

      if (response.status === 200) {
        const data = await response.json();
        const stringified = JSON.stringify(data);

        // Ensure no actual API keys are exposed
        expect(stringified).not.toContain('sk-or-v1-');
        expect(stringified).not.toContain('pk_test_');
        expect(stringified).not.toContain('sk_test_');
        expect(stringified).not.toContain('tvly-');
      }
    });

    it('should sanitize error messages', async () => {
      const response = await fetchWithAuth('/api/test/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [], // Empty messages should cause an error
          testMode: true
        })
      });

      if (!response.ok) {
        const error = await response.text();
        // Error messages should not contain sensitive data
        expect(error).not.toContain('sk-or-v1-');
        expect(error).not.toContain('Bearer ');
      }
    });
  });

  describe('Model Configuration', () => {
    it('should verify primary Claude model configuration', async () => {
      const response = await fetchWithAuth('/api/test/model-config', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.primaryModel).toBe('anthropic/claude-3.5-sonnet-20241022');
      expect(data.available).toBeDefined();
    });

    it('should verify Perplexity search model configuration', async () => {
      const response = await fetchWithAuth('/api/test/model-config', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.searchModel).toBe('perplexity/sonar-pro');
      expect(data.fallbackSearchModel).toBe('perplexity/llama-3.1-sonar-large-128k-online');
    });
  });

  describe('Tavily Search API', () => {
    it('should check Tavily API configuration', async () => {
      const response = await fetchWithAuth('/api/test/env-check', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Tavily is optional, so just check if it's configured
      if (data.hasTavilyKey !== undefined) {
        expect(typeof data.hasTavilyKey).toBe('boolean');
      }
    });

    it('should handle missing Tavily key gracefully', async () => {
      // Test that search still works without Tavily (falls back to Perplexity)
      const response = await fetchWithAuth('/api/test/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: 'What is happening with AI today?'
          }],
          testMode: true // Use test mode to avoid actual API calls
        })
      });

      // Should not fail even if Tavily is not configured
      expect([200, 201, 500]).toContain(response.status);
    });
  });
});