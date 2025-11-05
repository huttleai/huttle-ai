import { HelpCircle, Book, MessageCircle, Mail, ExternalLink } from 'lucide-react';

export default function Help() {
  const faqs = [
    {
      question: 'How do AI generations work?',
      answer: 'AI generations are used when Trend Lab, AI Plan Builder, or Huttle Agent create content for you. Your plan determines your monthly limit.'
    },
    {
      question: 'Can I connect multiple social accounts?',
      answer: 'Yes! Connect Instagram, TikTok, YouTube, and more from Settings > Connected Accounts.'
    },
    {
      question: 'How does the Trend Radar work?',
      answer: 'Trend Radar scans real-time data across platforms to identify emerging trends in your niche, using advanced AI technology to provide you with the most relevant insights.'
    }
  ];

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Help Center
        </h1>
        <p className="text-gray-600">
          Get answers and support for Huttle AI
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer">
          <Book className="w-8 h-8 text-huttle-primary mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Documentation</h3>
          <p className="text-sm text-gray-600 mb-3">Learn how to use all features</p>
          <div className="flex items-center text-huttle-primary text-sm font-medium">
            Browse Docs
            <ExternalLink className="w-3 h-3 ml-1" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer">
          <Mail className="w-8 h-8 text-huttle-primary mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
          <p className="text-sm text-gray-600 mb-3">Get help via email</p>
          <div className="flex items-center text-huttle-primary text-sm font-medium">
            Send Email
            <ExternalLink className="w-3 h-3 ml-1" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-huttle-primary" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-gray-200 pb-4 last:border-0">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

