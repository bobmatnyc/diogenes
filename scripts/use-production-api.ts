#!/usr/bin/env tsx
/**
 * Script to update Diogenes to use production Memory API
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_API_URL = 'https://mcp-memory-api.fly.dev/api/v1';
const ENV_FILE = path.join(process.cwd(), '.env.local');

async function updateToProductionAPI() {
  console.log('📡 Updating Diogenes to use production Memory API...\n');

  // Read current .env.local
  const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  const lines = envContent.split('\n');

  // Check if MEMORY_API_URL is already set
  const hasApiUrl = lines.some(line => line.startsWith('MEMORY_API_URL='));

  if (!hasApiUrl) {
    // Add the production API URL
    const updatedLines = [...lines];

    // Find where to insert (after other MEMORY_ variables)
    const memoryIndex = lines.findIndex(line => line.includes('MEMORY_API_'));
    if (memoryIndex !== -1) {
      updatedLines.splice(memoryIndex + 1, 0, `MEMORY_API_URL=${PRODUCTION_API_URL}`);
    } else {
      // Add at the end
      updatedLines.push(`\n# Production Memory API`);
      updatedLines.push(`MEMORY_API_URL=${PRODUCTION_API_URL}`);
    }

    fs.writeFileSync(ENV_FILE, updatedLines.join('\n'));
    console.log('✅ Added MEMORY_API_URL to .env.local');
  } else {
    // Update existing URL
    const updatedLines = lines.map(line => {
      if (line.startsWith('MEMORY_API_URL=')) {
        return `MEMORY_API_URL=${PRODUCTION_API_URL}`;
      }
      return line;
    });

    fs.writeFileSync(ENV_FILE, updatedLines.join('\n'));
    console.log('✅ Updated MEMORY_API_URL in .env.local');
  }

  console.log('\n📝 Configuration updated:');
  console.log(`   MEMORY_API_URL=${PRODUCTION_API_URL}`);

  console.log('\n🔧 Next steps:');
  console.log('1. Restart your Next.js development server');
  console.log('2. Test the memory API endpoints');
  console.log('3. Monitor logs with: fly logs --app mcp-memory-api');

  // Test the production API
  console.log('\n🧪 Testing production API...');
  try {
    const response = await fetch(`${PRODUCTION_API_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Production API is responding:', data);
    } else {
      console.log('⚠️  Production API returned status:', response.status);
    }
  } catch (error) {
    console.log('❌ Could not reach production API:', error instanceof Error ? error.message : String(error));
    console.log('   Make sure the API is deployed and running');
  }
}

updateToProductionAPI().catch(console.error);