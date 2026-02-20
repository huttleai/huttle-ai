import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-huttle-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Huttle AI
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 italic mb-10">Last updated: February 2026</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Introduction</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Huttle AI ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website and use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Information We Collect</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">We collect information you provide directly to us, including:</p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
              <li><span className="font-semibold">Account Information:</span> Name, email address, and password when you create an account</li>
              <li><span className="font-semibold">Payment Information:</span> When you make a purchase, our payment processor (Stripe) collects your payment card details. We do not store your full card information on our servers</li>
              <li><span className="font-semibold">Brand Profile Data:</span> Business niche, target audience, brand voice preferences, and social media platform selections you provide during onboarding</li>
              <li><span className="font-semibold">Usage Data:</span> Information about how you interact with our services, including features used, content generated, and preferences set</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
              <li>Provide, maintain, and improve our services</li>
              <li>Personalize AI-generated content based on your brand profile</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Send marketing communications (you can opt out at any time)</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. AI Data Processing</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Huttle AI uses third-party AI services to power content generation and analysis features. When you use AI-powered features:
            </p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
              <li><span className="font-semibold">xAI (Grok):</span> Used for content generation, caption writing, and trend analysis. Your prompts and brand context are sent to xAI's API for processing.</li>
              <li><span className="font-semibold">Perplexity:</span> Used for real-time trend research and social media update analysis. Query data is sent to Perplexity's API.</li>
              <li>We do not use your content to train AI models. Your data is processed solely to generate responses for your requests.</li>
              <li>AI-generated content is stored in your account for your convenience and is not shared with other users.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Third-Party Services</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">We use the following third-party services to operate Huttle AI:</p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
              <li><span className="font-semibold">Supabase:</span> Database hosting, authentication, and file storage. Your data is stored securely in Supabase's cloud infrastructure.</li>
              <li><span className="font-semibold">Stripe:</span> Payment processing. Stripe handles all payment card data directly; we never see or store your full card number.</li>
              <li><span className="font-semibold">Vercel:</span> Application hosting and serverless functions.</li>
              <li><span className="font-semibold">Mailchimp:</span> Email communications for waitlist and product updates.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Information Sharing</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
              <li><span className="font-semibold">Service Providers:</span> Third-party vendors who assist us in operating our services (as listed above)</li>
              <li><span className="font-semibold">Legal Requirements:</span> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Data Retention</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide you services. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. Data Security</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in transit (TLS) and at rest.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Your Rights</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">You have the right to:</p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Export your data</li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">To exercise these rights, contact us at <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">support@huttleai.com</a>.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. Cookies</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We use essential cookies to ensure our website functions properly. These include authentication session cookies managed by Supabase. We do not use third-party advertising cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. Children's Privacy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Huttle AI is not intended for use by anyone under the age of 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">12. Changes to This Policy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">13. Contact Us</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">support@huttleai.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; 2026 Huttle AI</span>
          <Link to="/terms" className="hover:text-huttle-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
