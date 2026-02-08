#!/usr/bin/env node

/**
 * Test Content Remix Studio n8n Workflow
 * 
 * This script tests the full flow:
 * 1. Calls your local proxy endpoint (/api/ai/n8n-generator)
 * 2. Proxy forwards to n8n webhook
 * 3. n8n executes: Time Anchor → Perplexity → Claude → Save to Supabase → Format API Response → Return
 * 4. Response comes back to this script
 * 
 * Run: node test-content-remix.js
 */

const testPayload = {
  userId: 'test-user-123',
  topic: `How I grew my SaaS to $10K MRR in 6 months without paid ads. 

The secret? I focused on three things:
1. SEO content that actually ranks
2. Building in public on Twitter/X 
3. Creating a community around my product

My audience became my best marketing channel. No ads, no gimmicks, just value.`,
  
  platform: 'multi-platform',
  contentType: 'remix',
  brandVoice: 'Authentic and Direct',
  remixMode: 'viral', // or 'sales'
  
  additionalContext: {
    mode: 'viral',
    niche: 'SaaS Marketing',
    targetAudience: 'B2B founders and indie hackers'
  }
};

console.log('🚀 Testing Content Remix Studio n8n Workflow\n');
console.log('📤 Sending payload:');
console.log(JSON.stringify(testPayload, null, 2));
console.log('\n⏳ Waiting for response (this may take 30-60 seconds)...\n');

const startTime = Date.now();

// Test directly against n8n webhook (bypassing Vercel proxy)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_GENERATOR || 'https://huttleai.app.n8n.cloud/webhook-test/6590b027-cde5-4c37-9144-c892ea814555';

fetch(N8N_WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testPayload),
})
  .then(response => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Response received in ${elapsed}s`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  })
  .then(data => {
    console.log('📥 Response Structure:');
    console.log('   - has content:', !!data.content);
    console.log('   - content length:', data.content?.length || 0, 'characters');
    console.log('   - has hashtags:', !!data.hashtags);
    console.log('   - has metadata:', !!data.metadata);
    console.log('   - metadata:', JSON.stringify(data.metadata, null, 2));
    
    console.log('\n📝 Content Preview (first 500 chars):');
    console.log('─'.repeat(80));
    console.log(data.content?.substring(0, 500) || 'NO CONTENT');
    console.log('─'.repeat(80));
    
    // Check if format matches expected markdown structure
    const hasIdea1 = data.content?.includes('### Idea 1:');
    const hasIdea2 = data.content?.includes('### Idea 2:');
    const hasIdea3 = data.content?.includes('### Idea 3:');
    const hasInstagram = data.content?.includes('**Instagram**:');
    const hasTikTok = data.content?.includes('**TikTok**:');
    const hasX = data.content?.includes('**X**:');
    const hasFacebook = data.content?.includes('**Facebook**:');
    const hasYouTube = data.content?.includes('**YouTube**:');
    
    console.log('\n✅ Format Validation:');
    console.log('   - Has Idea 1:', hasIdea1 ? '✓' : '✗');
    console.log('   - Has Idea 2:', hasIdea2 ? '✓' : '✗');
    console.log('   - Has Idea 3:', hasIdea3 ? '✓' : '✗');
    console.log('   - Has Instagram:', hasInstagram ? '✓' : '✗');
    console.log('   - Has TikTok:', hasTikTok ? '✓' : '✗');
    console.log('   - Has X/Twitter:', hasX ? '✓' : '✗');
    console.log('   - Has Facebook:', hasFacebook ? '✓' : '✗');
    console.log('   - Has YouTube:', hasYouTube ? '✓' : '✗');
    
    const allValid = hasIdea1 && hasIdea2 && hasIdea3 && hasInstagram && hasTikTok && hasX && hasFacebook && hasYouTube;
    
    if (allValid) {
      console.log('\n🎉 SUCCESS! Workflow is working perfectly!');
      console.log('✅ Response format matches frontend expectations');
      console.log('✅ Ready to use in production');
    } else {
      console.log('\n⚠️  WARNING: Some expected sections are missing');
      console.log('❌ Response may not render correctly in RemixContentDisplay');
      console.log('\nFull content:\n');
      console.log(data.content);
    }
  })
  .catch(error => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ Error after ${elapsed}s:`);
    console.error(error.message);
    console.error('\nPossible issues:');
    console.error('  1. n8n workflow not activated');
    console.error('  2. Perplexity API key missing in n8n');
    console.error('  3. Claude API key missing in n8n');
    console.error('  4. Network/timeout issue (workflow took > 60s)');
    console.error('  5. Workflow node misconfigured');
    process.exit(1);
  });
