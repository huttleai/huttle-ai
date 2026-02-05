/**
 * Mailchimp Waitlist Subscription Handler
 * 
 * Handles waitlist signups from the landing page "Join Waitlist" button
 * and adds subscribers to the Mailchimp audience.
 * 
 * Required environment variables:
 * - MAILCHIMP_WAITLIST_API_KEY: Your Mailchimp API key
 * - MAILCHIMP_WAITLIST_AUDIENCE_ID: Your Mailchimp audience ID
 */

import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_WAITLIST_API_KEY || '';
const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_WAITLIST_AUDIENCE_ID || '';
const MAILCHIMP_SERVER_PREFIX = MAILCHIMP_API_KEY.split('-')[1] || 'us22';

export default async function handler(req, res) {
  
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstName, lastName, email } = req.body;

    // Validate required fields
    if (!firstName || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'First name and email are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Check if Mailchimp credentials are configured
    if (!MAILCHIMP_API_KEY || !MAILCHIMP_AUDIENCE_ID) {
      console.error('❌ Mailchimp credentials not configured');
      console.error('❌ API Key exists:', !!MAILCHIMP_API_KEY);
      console.error('❌ Audience ID exists:', !!MAILCHIMP_AUDIENCE_ID);
      return res.status(500).json({ 
        error: 'Service configuration error',
        details: 'Mailchimp waitlist is not configured' 
      });
    }
    
    console.log('[subscribe-waitlist] Processing signup');

    // Prepare Mailchimp API request
    const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`;
    
    const memberData = {
      email_address: email,
      status: 'subscribed',
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName || '',
      },
      tags: ['Waitlist', 'Landing Page']
    };

    // SECURITY: Don't log Mailchimp API URL
    
    // Add subscriber to Mailchimp
    const mailchimpResponse = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });

    const mailchimpData = await mailchimpResponse.json();

    // Handle Mailchimp errors
    if (!mailchimpResponse.ok) {
      // Check if user already exists (common case)
      if (mailchimpData.title === 'Member Exists') {
        return res.status(200).json({ 
          success: true,
          message: 'You are already on the waitlist!',
          alreadySubscribed: true
        });
      }

      console.error('Mailchimp API error:', mailchimpData);
      return res.status(400).json({ 
        error: 'Failed to subscribe',
        details: mailchimpData.detail || 'Could not add to waitlist'
      });
    }

    // Success!
    console.log('[subscribe-waitlist] Signup successful');
    return res.status(200).json({ 
      success: true,
      message: 'Successfully joined the waitlist!',
    });

  } catch (error) {
    console.error('Waitlist subscription error:', error);
    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
}

