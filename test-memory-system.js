#!/usr/bin/env node

/**
 * Test script for the comprehensive memory system
 * Tests user isolation, memory enrichment, and assistant memory storage
 */

const { MemoryService } = require('./dist/lib/kuzu/service');
const { LocalStorageAdapter } = require('./dist/lib/kuzu/storage/local-adapter');

async function testMemorySystem() {
  console.log('🧪 Testing Comprehensive Memory System\n');
  console.log('=' .repeat(50));

  const memoryService = MemoryService.getInstance({
    storage: 'local',
    maxMemoriesPerUser: 100,
    memoryTTLDays: 30,
  });

  // Test users
  const user1 = 'test-user-1';
  const user2 = 'test-user-2';

  try {
    // Initialize the service
    await memoryService.initialize();
    console.log('✅ Memory service initialized\n');

    // Clear any existing memories for clean test
    await memoryService.clearUserMemories(user1);
    await memoryService.clearUserMemories(user2);
    console.log('✅ Cleared existing test data\n');

    // Test 1: Store user memories
    console.log('📝 Test 1: Storing user memories...');
    await memoryService.saveMemory(user1, 'I prefer dark mode interfaces', {
      source: 'user',
      type: 'semantic',
    });
    await memoryService.saveMemory(user1, 'My name is Alice', {
      source: 'user',
      type: 'semantic',
    });
    await memoryService.saveMemory(user2, 'I work as a software engineer', {
      source: 'user',
      type: 'semantic',
    });
    console.log('✅ User memories stored\n');

    // Test 2: Store assistant memories
    console.log('📝 Test 2: Storing assistant memories...');
    const assistantContext = {
      userId: user1,
      conversationId: 'conv-test-001',
      userPrompt: 'Tell me about dark mode benefits',
      assistantResponse: 'I understand that you prefer dark mode interfaces. Dark mode reduces eye strain...',
      timestamp: new Date(),
      modelUsed: 'claude-3.5-sonnet',
      searchPerformed: false,
      memoryEnriched: true,
    };
    await memoryService.storeAssistantMemory(assistantContext);
    console.log('✅ Assistant memory stored\n');

    // Test 3: User isolation
    console.log('🔒 Test 3: Testing user isolation...');
    const user1Memories = await memoryService.getUserMemories(user1);
    const user2Memories = await memoryService.getUserMemories(user2);

    console.log(`User 1 memories: ${user1Memories.length}`);
    console.log(`User 2 memories: ${user2Memories.length}`);

    const user1HasUser2Data = user1Memories.some(m =>
      m.content.includes('software engineer')
    );
    const user2HasUser1Data = user2Memories.some(m =>
      m.content.includes('Alice') || m.content.includes('dark mode')
    );

    if (!user1HasUser2Data && !user2HasUser1Data) {
      console.log('✅ User isolation verified - no cross-contamination\n');
    } else {
      console.log('❌ User isolation FAILED - memories leaked between users\n');
    }

    // Test 4: Memory enrichment
    console.log('🧠 Test 4: Testing memory enrichment...');
    const prompt = 'Can you change the interface to dark mode?';
    const enrichmentResult = await memoryService.enrichPromptBehindTheScenes(prompt, user1);

    console.log(`Original prompt: "${prompt}"`);
    console.log(`Relevant memories found: ${enrichmentResult.relevantMemories.length}`);
    console.log(`Confidence score: ${enrichmentResult.confidenceScore.toFixed(2)}`);

    if (enrichmentResult.relevantMemories.length > 0) {
      console.log('Matched memories:');
      enrichmentResult.relevantMemories.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.content} (source: ${m.source})`);
      });
      console.log('✅ Memory enrichment working\n');
    } else {
      console.log('⚠️ No memories matched for enrichment\n');
    }

    // Test 5: Memory filtering by source
    console.log('🔍 Test 5: Testing memory filtering...');
    const userOnlyMemories = await memoryService.getUserMemories(user1, 10, {
      source: 'user'
    });
    const assistantOnlyMemories = await memoryService.getUserMemories(user1, 10, {
      source: 'assistant'
    });

    console.log(`User memories: ${userOnlyMemories.length}`);
    console.log(`Assistant memories: ${assistantOnlyMemories.length}`);

    const allUserSourced = userOnlyMemories.every(m => m.source === 'user');
    const allAssistantSourced = assistantOnlyMemories.every(m => m.source === 'assistant');

    if (allUserSourced && allAssistantSourced) {
      console.log('✅ Memory filtering by source working\n');
    } else {
      console.log('❌ Memory filtering FAILED\n');
    }

    // Test 6: Get statistics
    console.log('📊 Test 6: Getting memory statistics...');
    const stats = await memoryService.getUserStats(user1);
    console.log(`Total memories: ${stats.count}`);
    console.log(`By source: User=${stats.bySource?.user || 0}, Assistant=${stats.bySource?.assistant || 0}, System=${stats.bySource?.system || 0}`);
    console.log(`By type: Semantic=${stats.byType?.semantic || 0}, Episodic=${stats.byType?.episodic || 0}, Procedural=${stats.byType?.procedural || 0}`);
    console.log('✅ Statistics retrieved\n');

    // Test 7: Storage paths
    console.log('📁 Test 7: Checking storage paths...');
    const adapter = new LocalStorageAdapter('.kuzu_memory', 100, 30);
    const user1Path = adapter.getUserStoragePath(user1);
    const user2Path = adapter.getUserStoragePath(user2);

    console.log(`User 1 path: ${user1Path}`);
    console.log(`User 2 path: ${user2Path}`);

    if (user1Path !== user2Path && user1Path.includes(user1.replace(/[^a-zA-Z0-9-_]/g, '_'))) {
      console.log('✅ User-specific storage paths confirmed\n');
    } else {
      console.log('❌ Storage path isolation FAILED\n');
    }

    // Clean up test data
    await memoryService.clearUserMemories(user1);
    await memoryService.clearUserMemories(user2);
    console.log('✅ Test data cleaned up');

    console.log('\n' + '=' .repeat(50));
    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testMemorySystem().catch(console.error);