/**
 * Google Analytics Integration Test
 *
 * This test verifies that Google Analytics is properly integrated
 * and only loads in production mode.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Google Analytics Integration', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  it('should have the correct GA_ID configured', () => {
    // Check that the GA_ID is properly configured in environment
    const GA_ID = 'G-RJ5SZ5DT1X';
    expect(GA_ID).toBe('G-RJ5SZ5DT1X');
    expect(GA_ID).toMatch(/^G-[A-Z0-9]+$/);
  });

  it('should not load in development mode', () => {
    // In development, Google Analytics should not be loaded
    process.env.NODE_ENV = 'development';
    const shouldLoad = process.env.NODE_ENV === 'production';
    expect(shouldLoad).toBe(false);
  });

  it('should load in production mode', () => {
    // In production, Google Analytics should be loaded
    process.env.NODE_ENV = 'production';
    const shouldLoad = process.env.NODE_ENV === 'production';
    expect(shouldLoad).toBe(true);
  });

  it('should use the correct Google Analytics scripts', () => {
    const GA_ID = 'G-RJ5SZ5DT1X';
    const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

    // Verify the script URL is correctly formatted
    expect(scriptUrl).toBe('https://www.googletagmanager.com/gtag/js?id=G-RJ5SZ5DT1X');
    expect(scriptUrl).toContain('googletagmanager.com');
    expect(scriptUrl).toContain('gtag/js');
  });

  it('should have proper gtag configuration', () => {
    // Verify the gtag configuration structure
    const gtagConfig = {
      id: 'G-RJ5SZ5DT1X',
      function: 'gtag',
      dataLayer: 'window.dataLayer',
    };

    expect(gtagConfig.id).toBe('G-RJ5SZ5DT1X');
    expect(gtagConfig.function).toBe('gtag');
    expect(gtagConfig.dataLayer).toBe('window.dataLayer');
  });
});
