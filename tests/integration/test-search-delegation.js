#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Search Delegation System
 * Tests the hybrid delegation pattern in Diogenes chat application
 */

const axios = require('axios');
const fs = require('fs').promises;

const API_URL = 'http://localhost:3001/api/chat';
const TEST_RESULTS_FILE = './test-results-delegation.json';

// Test categories with expected behaviors
const TEST_CASES = {
  shouldDelegate: [
    "What happened in the news today?",
    "Tell me about the latest developments in AI",
    "What's the current stock market situation?",
    "Who won the latest sports championship?",
    "What's the current price of Bitcoin?",
    "What's happening with the 2024 elections?",
    "Latest updates on climate change this year"
  ],
  
  shouldNotDelegate: [
    "What is the meaning of life?",
    "Tell me about ancient philosophy",
    "Why do humans fear death?",
    "Is virtue its own reward?",
    "What did Socrates believe about knowledge?",
    "How should one live a good life?",
    "What is the nature of reality?"
  ],
  
  edgeCases: [
    "What happened to Socrates and what's happening in Greece today?", // Mixed
    "Tell me about ancient wisdom and modern AI developments", // Mixed
    "Is Bitcoin a good investment philosophically?", // Ambiguous
    "What would Diogenes think about current social media trends?", // Philosophy + current
    "How do recent scientific discoveries relate to ancient skepticism?" // Mixed
  ]
};

class DelegationTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        mockMode: process.env.ENABLE_MOCK_SEARCH === 'true',
        nodeEnv: process.env.NODE_ENV
      },
      testResults: {},
      performance: {},
      summary: {}
    };
  }

  async makeRequest(message, conversationId = null) {
    const startTime = Date.now();
    
    try {
      const messages = [
        { role: 'user', content: message }
      ];

      const response = await axios.post(API_URL, 
        { messages },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Check for search delegation header
      const searchDelegated = response.headers['x-search-delegated'] === 'true';
      
      // Get response body (streaming response)
      let responseText = '';
      if (response.data) {
        // Handle streaming response
        if (typeof response.data === 'string') {
          responseText = response.data;
        } else if (response.data.choices && response.data.choices[0]) {
          responseText = response.data.choices[0].message.content;
        }
      }

      return {
        success: true,
        responseTime,
        searchDelegated,
        responseText,
        headers: response.headers,
        status: response.status
      };

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        success: false,
        error: error.message,
        responseTime,
        searchDelegated: false,
        status: error.response?.status || 0
      };
    }
  }

  async testDelegationDecisions() {
    console.log('\n=== Testing Delegation Decisions ===');
    
    // Test queries that SHOULD trigger delegation
    console.log('\n1. Testing queries that SHOULD trigger search delegation:');
    this.results.testResults.shouldDelegate = [];
    
    for (const query of TEST_CASES.shouldDelegate) {
      console.log(`\nTesting: "${query}"`);
      const result = await this.makeRequest(query);
      
      const testResult = {
        query,
        expected: 'should delegate',
        actual: result.searchDelegated ? 'delegated' : 'not delegated',
        success: result.success,
        responseTime: result.responseTime,
        passed: result.searchDelegated === true,
        error: result.error
      };
      
      this.results.testResults.shouldDelegate.push(testResult);
      
      console.log(`  Result: ${testResult.actual} (${testResult.passed ? 'PASS' : 'FAIL'})`);
      console.log(`  Response time: ${result.responseTime}ms`);
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      
      // Wait between requests to avoid overwhelming the server
      await this.sleep(1000);
    }

    // Test queries that should NOT trigger delegation
    console.log('\n2. Testing queries that should NOT trigger search delegation:');
    this.results.testResults.shouldNotDelegate = [];
    
    for (const query of TEST_CASES.shouldNotDelegate) {
      console.log(`\nTesting: "${query}"`);
      const result = await this.makeRequest(query);
      
      const testResult = {
        query,
        expected: 'should not delegate',
        actual: result.searchDelegated ? 'delegated' : 'not delegated',
        success: result.success,
        responseTime: result.responseTime,
        passed: result.searchDelegated === false,
        error: result.error
      };
      
      this.results.testResults.shouldNotDelegate.push(testResult);
      
      console.log(`  Result: ${testResult.actual} (${testResult.passed ? 'PASS' : 'FAIL'})`);
      console.log(`  Response time: ${result.responseTime}ms`);
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      
      await this.sleep(1000);
    }
  }

  async testEdgeCases() {
    console.log('\n=== Testing Edge Cases ===');
    this.results.testResults.edgeCases = [];
    
    for (const query of TEST_CASES.edgeCases) {
      console.log(`\nTesting edge case: "${query}"`);
      const result = await this.makeRequest(query);
      
      const testResult = {
        query,
        expected: 'variable (edge case)',
        actual: result.searchDelegated ? 'delegated' : 'not delegated',
        success: result.success,
        responseTime: result.responseTime,
        passed: result.success, // For edge cases, success means no errors
        error: result.error,
        responsePreview: result.responseText ? result.responseText.substring(0, 200) + '...' : null
      };
      
      this.results.testResults.edgeCases.push(testResult);
      
      console.log(`  Result: ${testResult.actual} (${testResult.passed ? 'PASS' : 'FAIL'})`);
      console.log(`  Response time: ${result.responseTime}ms`);
      
      if (result.responsePreview) {
        console.log(`  Response preview: ${result.responsePreview}`);
      }
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      
      await this.sleep(1500); // Longer delay for complex queries
    }
  }

  async testPerformance() {
    console.log('\n=== Performance Testing ===');
    
    const delegatedQuery = "What's the latest news about AI?";
    const nonDelegatedQuery = "What is the meaning of life?";
    
    console.log('\nTesting performance for delegated vs non-delegated queries...');
    
    // Test delegated queries
    const delegatedTimes = [];
    for (let i = 0; i < 3; i++) {
      console.log(`Delegated test ${i + 1}/3...`);
      const result = await this.makeRequest(delegatedQuery);
      if (result.success) {
        delegatedTimes.push(result.responseTime);
      }
      await this.sleep(2000);
    }
    
    // Test non-delegated queries
    const nonDelegatedTimes = [];
    for (let i = 0; i < 3; i++) {
      console.log(`Non-delegated test ${i + 1}/3...`);
      const result = await this.makeRequest(nonDelegatedQuery);
      if (result.success) {
        nonDelegatedTimes.push(result.responseTime);
      }
      await this.sleep(2000);
    }
    
    this.results.performance = {
      delegated: {
        times: delegatedTimes,
        average: delegatedTimes.reduce((a, b) => a + b, 0) / delegatedTimes.length,
        min: Math.min(...delegatedTimes),
        max: Math.max(...delegatedTimes)
      },
      nonDelegated: {
        times: nonDelegatedTimes,
        average: nonDelegatedTimes.reduce((a, b) => a + b, 0) / nonDelegatedTimes.length,
        min: Math.min(...nonDelegatedTimes),
        max: Math.max(...nonDelegatedTimes)
      }
    };
    
    console.log(`\nDelegated queries - Avg: ${this.results.performance.delegated.average.toFixed(0)}ms`);
    console.log(`Non-delegated queries - Avg: ${this.results.performance.nonDelegated.average.toFixed(0)}ms`);
    console.log(`Overhead: ${(this.results.performance.delegated.average - this.results.performance.nonDelegated.average).toFixed(0)}ms`);
  }

  async testCharacterConsistency() {
    console.log('\n=== Testing Character Consistency ===');
    
    const testQuery = "What's happening with AI development lately?";
    console.log(`\nTesting character consistency with: "${testQuery}"`);
    
    const result = await this.makeRequest(testQuery);
    
    if (result.success && result.responseText) {
      const response = result.responseText.toLowerCase();
      
      // Check for philosophical markers
      const philosophicalMarkers = [
        'but consider', 'question', 'skeptic', 'doubt', 'truly', 'nature of',
        'examine', 'challenge', 'wisdom', 'virtue', 'illusion', 'authentic'
      ];
      
      const foundMarkers = philosophicalMarkers.filter(marker => 
        response.includes(marker)
      );
      
      const characterConsistency = {
        query: testQuery,
        searchDelegated: result.searchDelegated,
        responseLength: result.responseText.length,
        philosophicalMarkers: foundMarkers,
        maintainsCharacter: foundMarkers.length >= 2,
        responsePreview: result.responseText.substring(0, 300) + '...'
      };
      
      this.results.testResults.characterConsistency = characterConsistency;
      
      console.log(`  Search delegated: ${result.searchDelegated ? 'Yes' : 'No'}`);
      console.log(`  Philosophical markers found: ${foundMarkers.length}`);
      console.log(`  Character maintained: ${characterConsistency.maintainsCharacter ? 'Yes' : 'No'}`);
      console.log(`  Markers: ${foundMarkers.join(', ')}`);
    } else {
      console.log('  Failed to get response for character consistency test');
    }
  }

  generateSummary() {
    const shouldDelegatePassed = this.results.testResults.shouldDelegate?.filter(t => t.passed).length || 0;
    const shouldDelegateTotal = this.results.testResults.shouldDelegate?.length || 0;
    
    const shouldNotDelegatePassed = this.results.testResults.shouldNotDelegate?.filter(t => t.passed).length || 0;
    const shouldNotDelegateTotal = this.results.testResults.shouldNotDelegate?.length || 0;
    
    const edgeCasesPassed = this.results.testResults.edgeCases?.filter(t => t.passed).length || 0;
    const edgeCasesTotal = this.results.testResults.edgeCases?.length || 0;
    
    this.results.summary = {
      shouldDelegate: {
        passed: shouldDelegatePassed,
        total: shouldDelegateTotal,
        percentage: shouldDelegateTotal > 0 ? (shouldDelegatePassed / shouldDelegateTotal * 100) : 0
      },
      shouldNotDelegate: {
        passed: shouldNotDelegatePassed,
        total: shouldNotDelegateTotal,
        percentage: shouldNotDelegateTotal > 0 ? (shouldNotDelegatePassed / shouldNotDelegateTotal * 100) : 0
      },
      edgeCases: {
        passed: edgeCasesPassed,
        total: edgeCasesTotal,
        percentage: edgeCasesTotal > 0 ? (edgeCasesPassed / edgeCasesTotal * 100) : 0
      },
      overallAccuracy: {
        passed: shouldDelegatePassed + shouldNotDelegatePassed,
        total: shouldDelegateTotal + shouldNotDelegateTotal,
        percentage: (shouldDelegateTotal + shouldNotDelegateTotal) > 0 ? 
          ((shouldDelegatePassed + shouldNotDelegatePassed) / (shouldDelegateTotal + shouldNotDelegateTotal) * 100) : 0
      }
    };
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    console.log('🧪 Starting Search Delegation System Test Suite');
    console.log('================================================');
    console.log(`Environment: ${this.results.environment.mockMode ? 'Mock Mode' : 'Live Mode'}`);
    console.log(`API URL: ${API_URL}`);
    
    try {
      await this.testDelegationDecisions();
      await this.testEdgeCases();
      await this.testPerformance();
      await this.testCharacterConsistency();
      
      this.generateSummary();
      
      // Save results
      await fs.writeFile(TEST_RESULTS_FILE, JSON.stringify(this.results, null, 2));
      
      console.log('\n=== TEST SUMMARY ===');
      console.log(`Should delegate accuracy: ${this.results.summary.shouldDelegate.passed}/${this.results.summary.shouldDelegate.total} (${this.results.summary.shouldDelegate.percentage.toFixed(1)}%)`);
      console.log(`Should not delegate accuracy: ${this.results.summary.shouldNotDelegate.passed}/${this.results.summary.shouldNotDelegate.total} (${this.results.summary.shouldNotDelegate.percentage.toFixed(1)}%)`);
      console.log(`Edge cases passed: ${this.results.summary.edgeCases.passed}/${this.results.summary.edgeCases.total} (${this.results.summary.edgeCases.percentage.toFixed(1)}%)`);
      console.log(`Overall accuracy: ${this.results.summary.overallAccuracy.passed}/${this.results.summary.overallAccuracy.total} (${this.results.summary.overallAccuracy.percentage.toFixed(1)}%)`);
      
      if (this.results.performance.delegated && this.results.performance.nonDelegated) {
        console.log(`\nPerformance overhead: ${(this.results.performance.delegated.average - this.results.performance.nonDelegated.average).toFixed(0)}ms`);
      }
      
      if (this.results.testResults.characterConsistency) {
        console.log(`Character consistency: ${this.results.testResults.characterConsistency.maintainsCharacter ? 'MAINTAINED' : 'COMPROMISED'}`);
      }
      
      console.log(`\nDetailed results saved to: ${TEST_RESULTS_FILE}`);
      console.log('\n✅ Test suite completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }
}

// Check if axios is available
async function checkDependencies() {
  try {
    require('axios');
    return true;
  } catch (error) {
    console.error('❌ axios is required but not installed.');
    console.log('Please run: npm install axios');
    return false;
  }
}

// Main execution
async function main() {
  if (!(await checkDependencies())) {
    process.exit(1);
  }
  
  const tester = new DelegationTester();
  await tester.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DelegationTester, TEST_CASES };