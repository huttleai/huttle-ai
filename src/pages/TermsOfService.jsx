// Huttle AI — Terms of Service | Last updated: April 15, 2026

import React from 'react';
import { Link } from 'react-router-dom';
import LegalPageLayout, { LegalCallout } from '../components/legal/LegalPageLayout';

const listClassName = 'list-disc space-y-2 pl-5';
const headingClassName = 'text-lg font-semibold text-slate-900';

const sections = [
  {
    id: 'acceptance-of-terms',
    title: 'Acceptance of Terms',
    content: (
      <>
        <p>
          By accessing or using Huttle AI, including `huttleai.com`, any related subdomains, and the
          Huttle AI platform, you agree to be bound by these Terms of Service and any policies
          incorporated by reference.
        </p>
        <p>
          If you do not agree to these Terms, you must not access or use the service.
        </p>
        <p>
          You represent that you are at least 18 years old, or the age of majority in your
          jurisdiction, and legally capable of entering into a binding agreement.
        </p>
        <p>
          If you use Huttle AI on behalf of a company, agency, or other business entity, you represent
          that you have authority to bind that entity, and that entity also accepts these Terms.
        </p>
      </>
    ),
  },
  {
    id: 'description-of-service',
    title: 'Description of Service',
    content: (
      <>
        <p>
          Huttle AI is an AI-powered content creation platform designed for solopreneurs, creators,
          and small businesses. It provides creative planning, ideation, research, and drafting tools
          intended to assist users with social media and marketing workflows.
        </p>
        <div>
          <h3 className={headingClassName}>Core platform features include:</h3>
          <ul className={`${listClassName} mt-3`}>
            <li>Caption Generator</li>
            <li>Hashtag Generator</li>
            <li>Hook Builder</li>
            <li>CTA Suggester</li>
            <li>Content Quality Scorer</li>
            <li>Trend Lab</li>
            <li>AI Plan Builder</li>
            <li>Ignite Engine</li>
            <li>Content Remix Studio</li>
            <li>Brand Voice</li>
            <li>Content Vault</li>
            <li>Visual Brainstormer</li>
            <li>Niche Intel</li>
            <li>Full Post Builder</li>
          </ul>
        </div>
        <p>
          Certain outputs are generated using third-party artificial intelligence models and providers,
          including xAI Grok, Perplexity AI, and Anthropic Claude. Those outputs are automated and are
          provided on an as-is basis.
        </p>
        <LegalCallout title="AI Output Disclaimer">
          <p>
            Huttle AI does not warrant that AI-generated content will be accurate, complete, current,
            non-infringing, or suitable for any particular purpose, campaign, audience, or platform.
          </p>
        </LegalCallout>
      </>
    ),
  },
  {
    id: 'subscription-plans-and-billing',
    title: 'Subscription Plans and Billing',
    content: (
      <>
        <p>Huttle AI currently offers the following subscription plans:</p>
        <ul className={listClassName}>
          <li>Essentials: $15/month or $153/year</li>
          <li>Pro: $39/month or $398/year</li>
          <li>Builders Club: $249/year (available for a limited time)</li>
        </ul>
        <p>
          Unless otherwise stated, subscriptions are billed in advance on a recurring monthly or annual
          basis. A seven-day free trial is available to new subscribers on Essentials and Pro plans. No
          charge is applied during the trial period, but your subscription will begin automatically when
          the trial ends unless you cancel before expiration.
        </p>
        <p>
          Monthly plans may be cancelled at any time, and access will continue through the end of the
          then-current billing period. Annual subscriptions (Essentials and Pro) are non-refundable after
          30 days from the purchase date, subject to the refund terms below. The Builders Club annual plan
          carries a 14-day happiness guarantee, as described in the Refund Policy.
        </p>
        <p>
          Huttle AI may change pricing upon at least 30 days&apos; written notice to existing
          subscribers. Payments are processed by Stripe, and Huttle AI does not store raw credit card
          data.
        </p>
        <p>
          Failed or declined payments may result in suspension or restriction of service until payment
          issues are resolved.
        </p>
        <LegalCallout title="Grandfathered Pricing">
          <p>
            The Founders Club plan ($199/year) is no longer available for new purchase. Existing Founders
            Club members are grandfathered — the price they locked in will not increase while their
            qualifying subscription remains in good standing.
          </p>
          <p>
            Builders Club pricing ($249/year) is likewise grandfathered for existing members once
            enrolled. If the Builders Club window closes, existing subscribers retain their rate for the
            life of their active subscription.
          </p>
        </LegalCallout>
      </>
    ),
  },
  {
    id: 'free-trial',
    title: 'Free Trial',
    content: (
      <>
        <p>
          Huttle AI may offer a seven-day free trial to eligible new users only. A valid payment method
          is required to start the trial.
        </p>
        <p>
          Trial eligibility is determined by Huttle AI in its sole discretion, and we may limit,
          revoke, modify, or discontinue trial offers at any time without notice.
        </p>
      </>
    ),
  },
  {
    id: 'refund-policy',
    title: 'Refund Policy',
    content: (
      <>
        <p>
          Builders Club annual plan: Huttle AI offers a 14-day happiness guarantee. Refund requests
          submitted within 14 days of purchase will be honored in full, no questions asked. No refunds
          are available after the 14-day window.
        </p>
        <p>
          Essentials and Pro plans (monthly and annual): All sales are final after the seven-day free
          trial period ends. No refunds are available for any Essentials or Pro subscription — monthly
          or annual — once the trial has expired and a charge has been processed. Cancelling a monthly
          plan stops future billing only; you retain access through the end of the current paid period.
        </p>
        <p>
          Grandfathered Founders Club members are subject to the same 14-day refund window that applied
          at the time of their original purchase.
        </p>
        <p>
          To request a refund, email{' '}
          <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">
            support@huttleai.com
          </a>{' '}
          with your account email address and the reason for your request. Additional details are
          available in our{' '}
          <Link to="/refund-policy" className="text-huttle-primary hover:underline">
            Refund Policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use-policy',
    title: 'Acceptable Use Policy',
    content: (
      <>
        <p>You may not use Huttle AI to:</p>
        <ul className={listClassName}>
          <li>Generate spam, misleading content, or deceptive marketing material</li>
          <li>Violate any applicable law, rule, or regulation</li>
          <li>Infringe the intellectual property or other rights of any third party</li>
          <li>Generate defamatory, harassing, threatening, abusive, or unlawful content</li>
          <li>Reverse-engineer, scrape, extract, or otherwise mine the platform or its data</li>
          <li>Share account credentials or resell access to the service</li>
          <li>Use the service to train competing AI models or competing products</li>
          <li>Circumvent rate limits, usage limits, paywalls, or access controls</li>
          <li>
            Generate content that violates the policies of Instagram, TikTok, X/Twitter, YouTube,
            LinkedIn, Facebook, or Pinterest
          </li>
        </ul>
        <p>
          Huttle AI reserves the right to investigate violations and suspend or terminate accounts that
          breach this policy, with or without notice and without refund where permitted by law.
        </p>
        <p>
          You may not access or use the service if you are located in, organized in, or ordinarily
          resident in a country or territory subject to comprehensive trade sanctions, or if you are a
          person or entity with whom U.S. persons are prohibited from doing business under applicable
          export control or sanctions laws.
        </p>
      </>
    ),
  },
  {
    id: 'ai-generated-content-disclaimer',
    title: 'AI-Generated Content Disclaimer',
    content: (
      <>
        <p>
          AI outputs made available through Huttle AI, including captions, hashtags, hooks, plans,
          blueprints, trend data, and related materials, are generated by third-party AI systems and
          may contain inaccuracies, inconsistencies, hallucinations, outdated information, or language
          that requires human review.
        </p>
        <p>
          Huttle AI does not guarantee any marketing outcome, engagement rate, follower growth,
          conversion result, traffic increase, or business result from the use of AI-generated outputs.
        </p>
        <p>
          You are solely responsible for reviewing, editing, fact-checking, and approving any output
          before publishing it to social media, email, websites, advertisements, or any other channel.
        </p>
        <p>
          Huttle AI will not be liable for consequences arising from your publication or use of
          AI-generated content without independent human review.
        </p>
        <p>
          Trend data and insights may be informed by real-time web queries or third-party sources but
          may not reflect current conditions at the time of use.
        </p>
        <LegalCallout tone="yellow" title="Human Review Required">
          <p>
            You should review all factual claims, trademark references, platform policy compliance,
            disclosures, and regulatory requirements before using or publishing any output.
          </p>
        </LegalCallout>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: (
      <>
        <p>
          The Huttle AI platform, including its software, codebase, branding, interface design,
          workflows, compilations, and proprietary features, is owned by Huttle AI and protected by
          copyright, trademark, and other applicable laws.
        </p>
        <p>
          Subject to these Terms and the applicable rights of the underlying AI providers, you own the
          outputs generated for you from your inputs. Ownership and usage of outputs may also be
          affected by the terms of xAI, Perplexity AI, Anthropic, and any other model provider used in
          the generation workflow.
        </p>
        <p>
          You grant Huttle AI a non-exclusive, limited license to process your inputs, prompts, and
          related materials solely for the purpose of operating, maintaining, and delivering the
          service.
        </p>
        <p>
          You may not claim ownership of the Huttle AI platform itself, its user interface, or any
          proprietary system architecture, methodologies, or features.
        </p>
      </>
    ),
  },
  {
    id: 'data-and-privacy',
    title: 'Data and Privacy',
    content: (
      <>
        <p>
          Your use of Huttle AI is also governed by our{' '}
          <Link to="/privacy" className="text-huttle-primary hover:underline">
            Privacy Policy
          </Link>
          , which describes how we collect, use, process, and protect personal information.
        </p>
        <p>
          By using the service, you consent to the data practices described in the Privacy Policy.
        </p>
      </>
    ),
  },
  {
    id: 'third-party-services',
    title: 'Third-Party Services',
    content: (
      <>
        <p>
          Huttle AI integrates with or relies upon third-party services, including Stripe for payments,
          Supabase for database and authentication services, xAI Grok for AI generation, Perplexity AI
          for AI and search, Anthropic Claude for AI generation, Mailchimp for email delivery, n8n for
          automation, and Vercel for hosting and infrastructure.
        </p>
        <p>
          Your use of those services may also be subject to their own terms, policies, and operational
          practices. Huttle AI is not responsible for the availability, actions, accuracy, security, or
          conduct of third-party providers.
        </p>
        <p>
          Instagram, TikTok, X/Twitter, YouTube, LinkedIn, Facebook, and Pinterest are not affiliated
          with, endorsed by, or sponsored by Huttle AI.
        </p>
      </>
    ),
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    content: (
      <>
        <LegalCallout tone="yellow" title="Liability Cap">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HUTTLE AI SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING
            DAMAGES FOR LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS INTERRUPTION.
          </p>
          <p>
            HUTTLE AI&apos;S TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICE OR
            THESE TERMS SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO HUTTLE AI IN THE THREE MONTHS
            PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
          </p>
          <p>
            SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS OF LIABILITY. IN THOSE JURISDICTIONS,
            LIABILITY WILL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
          </p>
        </LegalCallout>
      </>
    ),
  },
  {
    id: 'disclaimer-of-warranties',
    title: 'Disclaimer of Warranties',
    content: (
      <>
        <LegalCallout tone="yellow" title="No Warranties">
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
          </p>
          <p>
            HUTTLE AI DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, TIMELY,
            SECURE, OR FREE OF HARMFUL COMPONENTS.
          </p>
          <p>
            HUTTLE AI DOES NOT WARRANT ANY SPECIFIC MARKETING, CREATOR, OR BUSINESS OUTCOMES FROM USE
            OF THE SERVICE OR ANY OUTPUT GENERATED THROUGH IT.
          </p>
        </LegalCallout>
      </>
    ),
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    content: (
      <>
        <p>
          You agree to defend, indemnify, and hold harmless Huttle AI and its owners, officers,
          employees, contractors, affiliates, successors, and agents from and against any claims,
          liabilities, damages, judgments, losses, costs, and expenses, including reasonable attorneys&apos;
          fees, arising out of or related to:
        </p>
        <ul className={listClassName}>
          <li>Your use of the service</li>
          <li>Your violation of these Terms</li>
          <li>Content you generate, modify, publish, distribute, or rely upon using the platform</li>
        </ul>
      </>
    ),
  },
  {
    id: 'account-termination',
    title: 'Account Termination',
    content: (
      <>
        <p>
          You may cancel your account at any time through the billing portal, where available, or by
          contacting{' '}
          <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">
            support@huttleai.com
          </a>
          .
        </p>
        <p>
          Huttle AI may suspend or terminate your account for violations of these Terms, fraud, abuse,
          chargebacks, misuse of the platform, or non-payment.
        </p>
        <p>
          Upon termination, your right to access the service ceases immediately. Content stored in your
          Content Vault will be deleted within 30 days following account termination, unless a longer
          retention period is required by law or operational necessity.
        </p>
        <p>
          Subscribers who are terminated for violations of these Terms are not entitled to a refund of
          any annual fee, regardless of plan type or grandfathered status.
        </p>
      </>
    ),
  },
  {
    id: 'changes-to-terms',
    title: 'Changes to Terms',
    content: (
      <>
        <p>Huttle AI may update these Terms from time to time.</p>
        <p>
          If we make material changes, we will provide notice by email, in-app notice, or other
          reasonable means at least 14 days before the changes take effect, unless a shorter period is
          required by law, security needs, or urgent operational circumstances.
        </p>
        <p>
          Your continued use of the service after the effective date of updated Terms constitutes your
          acceptance of those updated Terms.
        </p>
      </>
    ),
  },
  {
    id: 'governing-law-and-disputes',
    title: 'Governing Law and Disputes',
    content: (
      <>
        <p>
          These Terms are governed by the laws of the State of Georgia, United States, without regard
          to conflict of laws principles.
        </p>
        <p>
          Any dispute, claim, or controversy arising out of or relating to these Terms or the service
          shall be resolved by binding arbitration administered by the American Arbitration Association
          under its applicable rules.
        </p>
        <p>
          Notwithstanding the foregoing, either party may seek injunctive or equitable relief in a
          court of competent jurisdiction in Georgia to protect confidential information, intellectual
          property, or other rights pending arbitration.
        </p>
        <p>
          To the fullest extent permitted by law, you waive any right to participate in a class action,
          collective action, or representative proceeding against Huttle AI.
        </p>
      </>
    ),
  },
  {
    id: 'general-provisions',
    title: 'General Provisions',
    content: (
      <>
        <p>
          These Terms, together with any policies or notices expressly incorporated by reference,
          constitute the entire agreement between you and Huttle AI regarding the service and supersede
          prior or contemporaneous understandings on that subject matter.
        </p>
        <p>
          If any provision of these Terms is found unenforceable, the remaining provisions will remain
          in full force and effect. A failure by Huttle AI to enforce any provision of these Terms will
          not operate as a waiver of that provision or any other provision.
        </p>
        <p>
          You may not assign or transfer these Terms, or any rights or obligations under them, without
          Huttle AI&apos;s prior written consent. Huttle AI may assign these Terms in connection with a
          merger, acquisition, corporate reorganization, or sale of assets.
        </p>
        <p>
          Huttle AI will not be responsible for delays or failures in performance caused by events
          beyond its reasonable control, including outages, infrastructure failures, labor disputes,
          natural disasters, governmental actions, internet disruptions, or third-party service
          interruptions.
        </p>
        <p>
          Any provisions of these Terms that by their nature should survive termination, including
          intellectual property, payment obligations, disclaimers, indemnities, limitations of
          liability, dispute resolution, and general provisions, will survive termination.
        </p>
      </>
    ),
  },
  {
    id: 'contact-information',
    title: 'Contact Information',
    content: (
      <>
        <p>
          Legal and general inquiries may be sent to{' '}
          <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">
            support@huttleai.com
          </a>
          .
        </p>
        <p>Mailing address: Huttle AI, Atlanta, GA, United States.</p>
        <p>
          For legal notices, please send written correspondence to the email above with
          &quot;Legal Notice&quot; in the subject line.
        </p>
      </>
    ),
  },
];

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="April 15, 2026"
      effectiveDate="April 15, 2026"
      intro="These Terms govern your access to and use of huttleai.com and the Huttle AI platform, including any services, content generation features, billing functionality, and related experiences offered by Huttle AI."
      sections={sections}
    >
      <LegalCallout title="Please Review Carefully">
        <p>
          These Terms contain important provisions on billing, arbitration, acceptable use, AI content
          risks, warranty disclaimers, and limits of liability.
        </p>
      </LegalCallout>
    </LegalPageLayout>
  );
}
