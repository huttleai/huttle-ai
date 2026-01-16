#!/usr/bin/env node
/**
 * Waitlist Connection Diagnostic Script
 * 
 * This script checks all components of the waitlist integration:
 * 1. Environment variables
 * 2. Mailchimp API connection
 * 3. API endpoint availability
 * 4. CORS configuration
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔍 WAITLIST CONNECTION DIAGNOSTICS\n');
console.log('='.repeat(60));

// Check 1: Environment Variables
console.log('\n1️⃣  ENVIRONMENT VARIABLES');
console.log('-'.repeat(60));

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_WAITLIST_API_KEY;
const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_WAITLIST_AUDIENCE_ID;

if (MAILCHIMP_API_KEY) {
  const maskedKey = MAILCHIMP_API_KEY.substring(0, 10) + '...' + MAILCHIMP_API_KEY.slice(-4);
  console.log('✅ MAILCHIMP_WAITLIST_API_KEY:', maskedKey);
  
  // Extract server prefix
  const serverPrefix = MAILCHIMP_API_KEY.split('-')[1];
  console.log('   Server prefix:', serverPrefix || '❌ INVALID FORMAT');
} else {
  console.log('❌ MAILCHIMP_WAITLIST_API_KEY: NOT SET');
}

if (MAILCHIMP_AUDIENCE_ID) {
  console.log('✅ MAILCHIMP_WAITLIST_AUDIENCE_ID:', MAILCHIMP_AUDIENCE_ID);
} else {
  console.log('❌ MAILCHIMP_WAITLIST_AUDIENCE_ID: NOT SET');
}

// Check 2: Mailchimp API Connection
console.log('\n2️⃣  MAILCHIMP API CONNECTION TEST');
console.log('-'.repeat(60));

if (MAILCHIMP_API_KEY && MAILCHIMP_AUDIENCE_ID) {
  const serverPrefix = MAILCHIMP_API_KEY.split('-')[1];
  const mailchimpUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}`;
  
  console.log('Testing API endpoint:', mailchimpUrl);
  console.log('Making request...');
  
  try {
    const response = await fetch(mailchimpUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connection successful!');
      console.log('   Audience Name:', data.name);
      console.log('   Total Members:', data.stats.member_count);
      console.log('   Subscribed:', data.stats.member_count_since_send || 0);
      
      // Check double opt-in setting
      if (data.double_optin) {
        console.log('⚠️  DOUBLE OPT-IN IS ENABLED');
        console.log('   New subscribers need to confirm via email before appearing in the list!');
        console.log('   They will show as "Pending" until confirmed.');
      } else {
        console.log('✅ Double opt-in is disabled - subscribers added immediately');
      }
    } else {
      const error = await response.json();
      console.log('❌ Connection failed!');
      console.log('   Status:', response.status);
      console.log('   Error:', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
} else {
  console.log('⏭️  Skipped - missing environment variables');
}

// Check 3: Test adding a subscriber
console.log('\n3️⃣  TEST SUBSCRIBER ADDITION');
console.log('-'.repeat(60));

if (MAILCHIMP_API_KEY && MAILCHIMP_AUDIENCE_ID) {
  const serverPrefix = MAILCHIMP_API_KEY.split('-')[1];
  const mailchimpUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`;
  
  const testEmail = `test+${Date.now()}@example.com`;
  console.log('Testing with email:', testEmail);
  
  const memberData = {
    email_address: testEmail,
    status: 'subscribed',
    merge_fields: {
      FNAME: 'Test',
      LNAME: 'Diagnostic',
    },
    tags: ['Waitlist', 'Diagnostic Test']
  };
  
  try {
    const response = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test subscriber added successfully!');
      console.log('   Email:', data.email_address);
      console.log('   Status:', data.status);
      console.log('   Member ID:', data.id);
      console.log('\n⚠️  Remember to delete this test subscriber from Mailchimp!');
    } else {
      const error = await response.json();
      console.log('❌ Failed to add subscriber');
      console.log('   Status:', response.status);
      console.log('   Error:', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
} else {
  console.log('⏭️  Skipped - missing environment variables');
}

// Check 4: API File Check
console.log('\n4️⃣  API FILES CHECK');
console.log('-'.repeat(60));

import { existsSync } from 'fs';

const apiFile = join(process.cwd(), 'api', 'subscribe-waitlist.js');
if (existsSync(apiFile)) {
  console.log('✅ api/subscribe-waitlist.js exists');
} else {
  console.log('❌ api/subscribe-waitlist.js NOT FOUND');
}

const corsFile = join(process.cwd(), 'api', '_utils', 'cors.js');
if (existsSync(corsFile)) {
  console.log('✅ api/_utils/cors.js exists');
} else {
  console.log('❌ api/_utils/cors.js NOT FOUND');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📋 SUMMARY');
console.log('='.repeat(60));

const issues = [];
if (!MAILCHIMP_API_KEY) issues.push('Missing MAILCHIMP_WAITLIST_API_KEY');
if (!MAILCHIMP_AUDIENCE_ID) issues.push('Missing MAILCHIMP_WAITLIST_AUDIENCE_ID');

if (issues.length > 0) {
  console.log('\n❌ ISSUES FOUND:');
  issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });
  console.log('\n📝 ACTION REQUIRED:');
  console.log('   1. Create a .env file in the project root');
  console.log('   2. Add the following variables:');
  console.log('      MAILCHIMP_WAITLIST_API_KEY=your-key-here');
  console.log('      MAILCHIMP_WAITLIST_AUDIENCE_ID=your-audience-id');
  console.log('   3. For production: Add these to Vercel environment variables');
  console.log('   4. Redeploy after adding environment variables');
} else {
  console.log('\n✅ All checks passed!');
  console.log('\n📝 NEXT STEPS:');
  console.log('   1. Check Vercel function logs for production issues');
  console.log('   2. Test the waitlist form in production');
  console.log('   3. Verify subscribers appear in Mailchimp');
}

console.log('\n');


