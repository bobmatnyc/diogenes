#!/usr/bin/env tsx

/**
 * Detailed test to debug assistant memory storage
 */

import { MemoryService } from './src/lib/kuzu/service';

async function testAssistantMemory() {
  console.log('🔍 Testing Assistant Memory Storage\n');

  const memoryService = MemoryService.getInstance({
    storage: 'local',
    maxMemoriesPerUser: 100,
    memoryTTLDays: 30,
  });

  const userId = 'test-assistant-user';

  try {
    await memoryService.initialize();
    await memoryService.clearUserMemories(userId);

    // Store user memory
    console.log('1️⃣ Storing user memory...');
    await memoryService.saveMemory(userId, 'I like TypeScript', {
      source: 'user',
      type: 'semantic',
    });

    // Store assistant memory
    console.log('2️⃣ Storing assistant memory...');
    const context = {
      userId,
      conversationId: 'conv-123',
      userPrompt: 'What is TypeScript?',
      assistantResponse: 'TypeScript is a typed superset of JavaScript...',
      timestamp: new Date(),
    };
    await memoryService.storeAssistantMemory(context);

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get all memories
    console.log('\n3️⃣ All memories:');
    const allMemories = await memoryService.getUserMemories(userId);
    allMemories.forEach((m, i) => {
      console.log(`  ${i + 1}. [${m.source}] ${m.content.substring(0, 50)}...`);
    });

    // Get filtered memories
    console.log('\n4️⃣ User memories only:');
    const userMemories = await memoryService.getUserMemories(userId, 10, {
      source: 'user'
    });
    console.log(`  Found: ${userMemories.length}`);

    console.log('\n5️⃣ Assistant memories only:');
    const assistantMemories = await memoryService.getUserMemories(userId, 10, {
      source: 'assistant'
    });
    console.log(`  Found: ${assistantMemories.length}`);
    assistantMemories.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.content.substring(0, 100)}...`);
    });

    // Get stats
    console.log('\n6️⃣ Statistics:');
    const stats = await memoryService.getUserStats(userId);
    console.log('  Total:', stats.count);
    console.log('  By source:', JSON.stringify(stats.bySource));
    console.log('  By type:', JSON.stringify(stats.byType));

    // Cleanup
    await memoryService.clearUserMemories(userId);
    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAssistantMemory().catch(console.error);