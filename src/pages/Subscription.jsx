import { Check, CreditCard, Zap, Crown, Star } from 'lucide-react';
import Badge from '../components/Badge';

export default function Subscription() {
  const plans = [
    {
      name: 'Freemium',
      price: '$0',
      icon: Star,
      features: [
        'Basic Trend Radar (1 platform)',
        '5 AI generations per month',
        'Basic insights',
        'Email support'
      ],
      color: 'gray'
    },
    {
      name: 'Essentials',
      price: '$29',
      icon: Zap,
      popular: true,
      features: [
        'Full Trend Lab access',
        '50 AI generations per month',
        'Smart Calendar',
        'Content Library',
        'AI Plan Builder',
        'Priority support'
      ],
      color: 'huttle-primary'
    },
    {
      name: 'Pro',
      price: '$79',
      icon: Crown,
      features: [
        'Unlimited AI generations',
        'Custom trend filters & alerts',
        'Huttle Agent (Beta)',
        'Advanced analytics',
        'Auto-publishing',
        '1-on-1 onboarding',
        '24/7 priority support'
      ],
      color: 'purple'
    }
  ];

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Subscription
        </h1>
        <p className="text-gray-600">
          Choose the perfect plan for your content creation needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white rounded-xl shadow-sm border-2 ${
              plan.popular ? 'border-huttle-primary' : 'border-gray-200'
            } p-6 hover:shadow-lg transition-all relative`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="primary">Most Popular</Badge>
              </div>
            )}

            <div className="text-center mb-6">
              <div className={`w-12 h-12 rounded-full bg-${plan.color === 'huttle-primary' ? 'huttle-primary' : plan.color}-100 flex items-center justify-center mx-auto mb-4`}>
                <plan.icon className={`w-6 h-6 text-${plan.color === 'huttle-primary' ? 'huttle-primary' : plan.color}-600`} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                plan.popular
                  ? 'bg-huttle-primary text-white hover:bg-huttle-primary-dark shadow-md'
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-huttle-primary hover:text-huttle-primary'
              }`}
            >
              {plan.name === 'Freemium' ? 'Current Plan' : 'Upgrade Now'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-huttle-primary" />
          <h2 className="text-xl font-bold">Payment Method</h2>
        </div>
        <p className="text-gray-600 mb-4">No payment method on file</p>
        <button className="px-6 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-sm">
          Add Payment Method
        </button>
      </div>
    </div>
  );
}

