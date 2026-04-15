// Huttle AI — Privacy Policy | Last updated: April 15, 2026

import React from 'react';
import LegalPageLayout, { LegalCallout } from '../components/legal/LegalPageLayout';

const listClassName = 'list-disc space-y-2 pl-5';
const headingClassName = 'text-lg font-semibold text-slate-900';

const sections = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: (
      <>
        <div>
          <h3 className={headingClassName}>1.1 Information You Provide</h3>
          <ul className={`${listClassName} mt-3`}>
            <li>
              Account registration information such as email address, first name, and password. Your
              password is hashed by Supabase Auth, and we do not receive your raw password.
            </li>
            <li>
              Profile data such as display name, profile picture, niche or industry, target audience,
              and brand voice preferences.
            </li>
            <li>
              Content inputs that you enter into AI tools, including captions, topics, hooks, prompts,
              brand details, and similar creative instructions used to generate outputs.
            </li>
            <li>
              Billing-related records. Payment information is processed by Stripe, and Huttle AI stores
              only Stripe customer references and subscription status, not raw card data.
            </li>
            <li>Communications you send to support@huttleai.com or through support channels.</li>
          </ul>
        </div>
        <div>
          <h3 className={headingClassName}>1.2 Information Collected Automatically</h3>
          <ul className={`${listClassName} mt-3`}>
            <li>Usage data such as features used, generation counts, tool interactions, and session duration</li>
            <li>Technical data such as IP address, browser type, device type, operating system, and referring URL</li>
            <li>
              Cookies and local storage items such as session tokens, preference settings, and tour
              completion status
            </li>
          </ul>
        </div>
        <div>
          <h3 className={headingClassName}>1.3 Information from Third Parties</h3>
          <ul className={`${listClassName} mt-3`}>
            <li>Stripe subscription status and billing history, excluding raw card data</li>
            <li>Supabase Auth OAuth login data if social sign-in is enabled in the future</li>
            <li>n8n workflow trigger events associated with your user ID</li>
            <li>
              Meta Pixel event data, including browser identifiers and page interaction signals, shared
              with Meta Platforms, Inc. in connection with our use of the Meta Pixel on marketing pages
            </li>
          </ul>
        </div>
      </>
    ),
  },
  {
    id: 'how-we-use-your-information',
    title: 'How We Use Your Information',
    content: (
      <>
        <p>We use your information to:</p>
        <ul className={listClassName}>
          <li>Provide, maintain, support, and improve the Huttle AI service</li>
          <li>Authenticate your identity and administer your account</li>
          <li>Process payments and manage subscriptions through Stripe</li>
          <li>
            Generate AI outputs in response to your prompts using third-party AI providers including
            xAI Grok, Perplexity AI, and Anthropic Claude
          </li>
          <li>
            Generate personalized AI content recommendations using information you provide — such as
            your niche, goals, brand voice, and content preferences. This information may be
            transmitted to third-party AI providers (xAI, Anthropic, Perplexity AI) solely for the
            purpose of generating your content. We do not use your data to train AI models, and we
            require our AI providers to handle your data in accordance with their respective privacy
            policies.
          </li>
          <li>Send transactional emails such as welcome messages, receipts, and subscription notices via Mailchimp</li>
          <li>Send product updates and feature announcements, subject to your marketing preferences</li>
          <li>Enforce our Terms of Service and Acceptable Use Policy</li>
          <li>Analyze aggregate product usage trends to improve the service</li>
          <li>Comply with legal obligations, resolve disputes, and prevent misuse</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-your-inputs-are-processed-by-ai',
    title: 'How Your Inputs Are Processed by AI',
    content: (
      <>
        <p>
          Content you submit into Huttle AI tools, including captions, topics, niche details, and brand
          voice inputs, may be sent to third-party AI APIs in order to generate outputs.
        </p>
        <ul className={listClassName}>
          <li>
            xAI (Grok): inputs are processed pursuant to xAI&apos;s privacy practices at{' '}
            <a href="https://x.ai/privacy" className="text-huttle-primary hover:underline">
              x.ai/privacy
            </a>
          </li>
          <li>
            Perplexity AI: inputs are processed pursuant to Perplexity&apos;s privacy practices at{' '}
            <a href="https://www.perplexity.ai/privacy" className="text-huttle-primary hover:underline">
              perplexity.ai/privacy
            </a>
          </li>
          <li>
            Anthropic (Claude): inputs are processed pursuant to Anthropic&apos;s privacy practices at{' '}
            <a href="https://www.anthropic.com/privacy" className="text-huttle-primary hover:underline">
              anthropic.com/privacy
            </a>
          </li>
        </ul>
        <p>Huttle AI does not use your content inputs to train AI models.</p>
        <LegalCallout tone="yellow" title="Sensitive Information Warning">
          <p>
            We strongly recommend that you do not enter personally identifiable information, financial
            account details, health information, or other sensitive personal data into AI generation
            tools unless strictly necessary and legally permitted.
          </p>
        </LegalCallout>
      </>
    ),
  },
  {
    id: 'how-we-share-your-information',
    title: 'How We Share Your Information',
    content: (
      <>
        <p>We do not sell your personal data. We share data only with the following categories of recipients:</p>
        <ul className={listClassName}>
          <li>
            Stripe for payment processing (
            <a href="https://stripe.com/privacy" className="text-huttle-primary hover:underline">
              stripe.com/privacy
            </a>
            )
          </li>
          <li>
            Supabase for database hosting and authentication (
            <a href="https://supabase.com/privacy" className="text-huttle-primary hover:underline">
              supabase.com/privacy
            </a>
            )
          </li>
          <li>
            Vercel for hosting and serverless infrastructure (
            <a
              href="https://vercel.com/legal/privacy-policy"
              className="text-huttle-primary hover:underline"
            >
              vercel.com/legal/privacy-policy
            </a>
            )
          </li>
          <li>
            xAI for AI generation of prompts without sharing your account login credentials (
            <a href="https://x.ai/privacy" className="text-huttle-primary hover:underline">
              x.ai/privacy
            </a>
            )
          </li>
          <li>
            Perplexity AI for AI and search query processing (
            <a href="https://www.perplexity.ai/privacy" className="text-huttle-primary hover:underline">
              perplexity.ai/privacy
            </a>
            )
          </li>
          <li>
            Anthropic for AI generation (
            <a href="https://www.anthropic.com/privacy" className="text-huttle-primary hover:underline">
              anthropic.com/privacy
            </a>
            )
          </li>
          <li>
            Mailchimp for email communications (
            <a
              href="https://mailchimp.com/legal/privacy/"
              className="text-huttle-primary hover:underline"
            >
              mailchimp.com/legal/privacy
            </a>
            )
          </li>
          <li>
            n8n for workflow automation (
            <a href="https://n8n.io/legal/privacy" className="text-huttle-primary hover:underline">
              n8n.io/legal/privacy
            </a>
            )
          </li>
          <li>
            Meta Platforms, Inc. for marketing measurement and analytics via the Meta Pixel (
            <a href="https://www.facebook.com/privacy/policy/" className="text-huttle-primary hover:underline">
              facebook.com/privacy/policy
            </a>
            ). Browser and page-view data is shared with Meta when you visit our marketing pages.
          </li>
          <li>Law enforcement, regulators, or government authorities when required by law</li>
          <li>
            Successor entities in connection with a merger, acquisition, financing, or sale of assets,
            in which case we will provide notice where legally required
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-retention',
    title: 'Data Retention',
    content: (
      <>
        <ul className={listClassName}>
          <li>Account data is retained while your account is active and for up to 90 days after a deletion request</li>
          <li>Content Vault data is deleted within 30 days of account termination</li>
          <li>
            AI generation inputs are not stored by Huttle AI beyond the current session, while third-party
            AI providers may apply their own retention policies
          </li>
          <li>Billing records are retained for seven years for tax and legal compliance, primarily through Stripe</li>
          <li>Support emails are retained for up to three years</li>
        </ul>
      </>
    ),
  },
  {
    id: 'cookies-and-tracking',
    title: 'Cookies and Tracking',
    content: (
      <>
        <ul className={listClassName}>
          <li>Session cookies are required for authentication and cannot be opted out of while using the service</li>
          <li>Local storage is used for preference settings, tour status, and other UI state that does not require sensitive personal data</li>
          <li>
            Huttle AI uses the Meta Pixel (Facebook Pixel), a tracking technology provided by Meta Platforms,
            Inc., on our marketing pages. The Meta Pixel collects information about your browser, device, and
            actions taken on our site (such as page views) and sends that information to Meta. We use this data
            to understand how visitors interact with our site and to measure the effectiveness of our marketing.
            Meta may use this information in accordance with its own data policy at{' '}
            <a href="https://www.facebook.com/privacy/policy/" className="text-huttle-primary hover:underline">
              facebook.com/privacy/policy
            </a>
            .
          </li>
          <li>
            You can opt out of Meta&apos;s use of your data for advertising purposes via Meta&apos;s ad
            settings at{' '}
            <a href="https://www.facebook.com/ads/preferences" className="text-huttle-primary hover:underline">
              facebook.com/ads/preferences
            </a>
            , or via the Digital Advertising Alliance opt-out tool at{' '}
            <a href="https://optout.aboutads.info" className="text-huttle-primary hover:underline">
              optout.aboutads.info
            </a>
            .
          </li>
          <li>
            We do not currently use other third-party analytics SDKs such as Google Analytics or Mixpanel.
            Internal product usage metrics are derived from aggregate Supabase query logs.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: (
      <>
        <p>Depending on your location, you may have the right to:</p>
        <ul className={listClassName}>
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate or incomplete personal data</li>
          <li>Delete your account and associated personal data</li>
          <li>Request portability of your data in a machine-readable format</li>
          <li>Object to certain processing activities</li>
          <li>Opt out of marketing emails using the unsubscribe link or by contacting support@huttleai.com</li>
        </ul>
        <p>
          To exercise these rights, email{' '}
          <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">
            support@huttleai.com
          </a>{' '}
          with the subject line &quot;Privacy Request — [Right Name]&quot; and include your account email
          address. We will respond within 30 days.
        </p>
        <p>
          For your protection, we may request reasonable information to verify your identity and
          authority before fulfilling a privacy request, and we may limit or deny requests where an
          applicable legal exception applies.
        </p>
      </>
    ),
  },
  {
    id: 'gdpr-european-users',
    title: 'GDPR (European Users)',
    content: (
      <>
        <ul className={listClassName}>
          <li>Our legal bases for processing include contract performance, legitimate interests, and legal obligations</li>
          <li>Data controller: Huttle AI, Atlanta, GA, USA</li>
          <li>
            Cross-border transfers may occur to the United States and other countries where our service
            providers operate; by using the service, you acknowledge and consent to those transfers where
            permitted
          </li>
          <li>You may lodge a complaint with your local supervisory authority if you believe your rights have been violated</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ccpa-california-users',
    title: 'CCPA (California Users)',
    content: (
      <>
        <ul className={listClassName}>
          <li>We do not sell personal information as defined by the CCPA</li>
          <li>California residents may request to know what personal information we collect and request deletion of eligible data</li>
          <li>
            Authorized agent requests may be submitted to support@huttleai.com with the subject line
            &quot;CCPA Request&quot;
          </li>
          <li>We will not discriminate against you for exercising applicable privacy rights</li>
        </ul>
      </>
    ),
  },
  {
    id: 'childrens-privacy',
    title: "Children's Privacy",
    content: (
      <>
        <p>Huttle AI is not directed to children under 13 years of age.</p>
        <p>
          We do not knowingly collect personal information from children under 13. If we learn that we
          have collected such information, we will delete it as promptly as reasonably possible.
        </p>
        <p>
          If you believe a child under 13 has provided us with information, contact{' '}
          <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">
            support@huttleai.com
          </a>{' '}
          immediately.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    content: (
      <>
        <ul className={listClassName}>
          <li>Data is stored in Supabase with row-level security controls designed to restrict access to authorized users</li>
          <li>Passwords are hashed by Supabase Auth using industry-standard mechanisms, and we do not see raw passwords</li>
          <li>API keys are stored in Vercel environment variables and are not intentionally exposed client-side</li>
          <li>Payment data is handled exclusively by Stripe under its PCI DSS-compliant environment</li>
          <li>We use HTTPS and TLS to protect data in transit</li>
          <li>Access to production systems and third-party service providers is limited to operational needs and managed through technical and administrative controls</li>
        </ul>
        <p>
          Despite these safeguards, no internet or cloud-based system can be guaranteed to be 100%
          secure, and we cannot guarantee absolute security.
        </p>
      </>
    ),
  },
  {
    id: 'changes-to-this-policy',
    title: 'Changes to This Policy',
    content: (
      <>
        <p>We may update this Privacy Policy from time to time.</p>
        <p>
          If we make material changes, we will provide notice by email or similar communication at
          least 14 days before those changes take effect, unless a shorter notice period is required by
          law, security needs, or urgent operational circumstances.
        </p>
        <p>
          Continued use of the service after the effective date of an updated Privacy Policy constitutes
          acceptance of the revised Policy.
        </p>
        <p>The &quot;Last updated&quot; date at the top of this page reflects the most recent revision.</p>
      </>
    ),
  },
  {
    id: 'contact-us',
    title: 'Contact Us',
    content: (
      <>
        <p>
          Privacy questions may be directed to{' '}
          <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">
            support@huttleai.com
          </a>
          .
        </p>
        <p>Use the subject line: &quot;Privacy Inquiry&quot;.</p>
        <p>Huttle AI, Atlanta, GA, United States.</p>
      </>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="April 15, 2026"
      effectiveDate="April 15, 2026"
      intro='Huttle AI ("we", "us", and "our") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, when we share it, and the rights and choices available to you.'
      sections={sections}
    >
      <LegalCallout title="Privacy At A Glance">
        <p>
          We do not sell personal data. We rely on core service providers like Supabase, Stripe, and
          Vercel to operate the platform, and AI prompts may be processed by third-party model providers
          (xAI Grok, Perplexity AI, and Anthropic Claude) to deliver Huttle AI features.
        </p>
        <p>
          We use the Meta Pixel on our marketing pages to measure how visitors interact with our site.
          Page-view signals are shared with Meta Platforms, Inc. under Meta&apos;s privacy policy. We do
          not use this data to serve ads directly; Meta may use it in accordance with its own advertising
          practices.
        </p>
      </LegalCallout>
    </LegalPageLayout>
  );
}
