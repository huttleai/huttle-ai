import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-huttle-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Huttle AI
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 italic mb-10">Last updated: February 2026</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              By accessing or using Huttle AI ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Huttle AI is an AI-powered content creation platform that helps users plan, create, and optimize social media content. Features include content generation, viral predictions, trend analysis, and scheduling tools.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. Account Registration</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">To use certain features, you must create an account. You agree to:</p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Subscription and Payments</h2>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
              <li><span className="font-semibold">Founding Member Pricing:</span> $199/year, locked in forever for founding members</li>
              <li><span className="font-semibold">Regular Pricing:</span> As displayed on our pricing page after the founding member period ends</li>
              <li>Payments are processed securely through Stripe</li>
              <li>All fees are non-refundable except as described in our Refund Policy below</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Refund Policy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              All sales are final for Founding Member subscriptions. Any additional questions regarding current and future subscription trials and refunds, contact support@huttleai.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Acceptable Use</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">You agree NOT to use the Service to:</p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
              <li>Violate any laws or regulations</li>
              <li>Generate content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the Service to spam or send unsolicited messages</li>
              <li>Resell or redistribute the Service without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Intellectual Property</h2>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
              <li><span className="font-semibold">Our Content:</span> The Service, including its design, features, and content created by us, is owned by Huttle AI and protected by intellectual property laws</li>
              <li><span className="font-semibold">Your Content:</span> You retain ownership of content you create using the Service. By using the Service, you grant us a license to process your content solely to provide the Service to you</li>
              <li><span className="font-semibold">AI-Generated Content:</span> Content generated by our AI tools is yours to use. However, you are responsible for ensuring your use of generated content complies with applicable laws</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. AI-Generated Content Disclaimer</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Huttle AI uses third-party AI services (including xAI Grok, Anthropic Claude, and Perplexity) to generate content suggestions, trend analyses, and creative outputs. AI-generated content may not always be accurate, original, or appropriate for your specific use case. You are solely responsible for reviewing, editing, and publishing any AI-generated content. Huttle AI does not guarantee the accuracy, completeness, or suitability of AI-generated outputs.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Disclaimer of Warranties</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee that:</p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
              <li>The Service will be uninterrupted or error-free</li>
              <li>AI-generated content will be accurate, complete, or suitable for any purpose</li>
              <li>Viral predictions or trend analysis will guarantee specific results</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. Limitation of Liability</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              To the maximum extent permitted by law, Huttle AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. Termination</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We may suspend or terminate your account at any time for violation of these Terms. You may cancel your account at any time by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">12. Changes to Terms</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We may modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">13. Governing Law</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">14. Contact Us</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">support@huttleai.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; 2026 Huttle AI</span>
          <Link to="/privacy" className="hover:text-huttle-primary transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
