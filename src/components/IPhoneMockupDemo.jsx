import IPhoneMockup from './IPhoneMockup';
import { Smartphone, Download, Share2 } from 'lucide-react';

/**
 * IPhoneMockupDemo Component
 * 
 * Demo page/component showcasing how to use the IPhoneMockup component.
 * You can use this as a reference or integrate it into your existing pages.
 */
export default function IPhoneMockupDemo() {
  return (
    <div className="flex-1 min-h-screen bg-gray-50/50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900">
            iPhone Mockup Showcase
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Display your mobile screenshots in beautiful iPhone frames. Perfect for presentations, marketing, and documentation.
          </p>
        </div>

        {/* Size Variants */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Size Variants</h2>
            <p className="text-gray-600">Choose from small, medium, or large frames</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Small */}
            <div className="space-y-4">
              <h3 className="text-center font-semibold text-gray-700">Small (iPhone SE)</h3>
              <IPhoneMockup 
                imageSrc="/viral-blueprint-mobile.png" 
                imageAlt="Viral Blueprint mobile view"
                size="small"
              />
            </div>

            {/* Medium (Default) */}
            <div className="space-y-4">
              <h3 className="text-center font-semibold text-gray-700">Medium (iPhone 13/14)</h3>
              <IPhoneMockup 
                imageSrc="/viral-blueprint-mobile.png" 
                imageAlt="Viral Blueprint mobile view"
                size="medium"
              />
            </div>

            {/* Large */}
            <div className="space-y-4">
              <h3 className="text-center font-semibold text-gray-700">Large (iPhone 14 Pro Max)</h3>
              <IPhoneMockup 
                imageSrc="/viral-blueprint-mobile.png" 
                imageAlt="Viral Blueprint mobile view"
                size="large"
              />
            </div>
          </div>
        </div>

        {/* Without Background */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Background</h2>
            <p className="text-gray-600">Use showBackground=false for a transparent look</p>
          </div>

          <div className="flex justify-center">
            <IPhoneMockup 
              imageSrc="/viral-blueprint-mobile.png" 
              imageAlt="Viral Blueprint mobile view"
              showBackground={false}
            />
          </div>
        </div>

        {/* Usage Examples */}
        <div className="glass-panel rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">How to Use</h2>
          </div>

          <div className="space-y-4 text-gray-700">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-2">1. Import the component</h3>
              <code className="text-sm text-blue-600">
                import IPhoneMockup from &apos;./components/IPhoneMockup&apos;;
              </code>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-2">2. Add your screenshot to /public/</h3>
              <p className="text-sm text-gray-600">
                Place your image in the public folder (e.g., <code className="text-blue-600">/public/viral-blueprint-mobile.png</code>)
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-2">3. Use the component</h3>
              <pre className="text-sm text-blue-600 bg-white rounded-lg p-4 border border-gray-200 overflow-x-auto">
{`<IPhoneMockup 
  imageSrc="/your-screenshot.png" 
  imageAlt="Your app description"
  size="medium"
  showBackground={true}
/>`}
              </pre>
            </div>
          </div>
        </div>

        {/* Props Reference */}
        <div className="glass-panel rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Props Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 pr-4 font-semibold text-gray-900">Prop</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-900">Type</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-900">Default</th>
                  <th className="pb-3 font-semibold text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-mono text-sm text-blue-600">imageSrc</td>
                  <td className="py-3 pr-4 text-sm">string</td>
                  <td className="py-3 pr-4 text-sm">-</td>
                  <td className="py-3 text-sm">Path to the image (required)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-mono text-sm text-blue-600">imageAlt</td>
                  <td className="py-3 pr-4 text-sm">string</td>
                  <td className="py-3 pr-4 text-sm">&quot;Mobile screenshot&quot;</td>
                  <td className="py-3 text-sm">Alt text for accessibility</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-mono text-sm text-blue-600">size</td>
                  <td className="py-3 pr-4 text-sm">&quot;small&quot; | &quot;medium&quot; | &quot;large&quot;</td>
                  <td className="py-3 pr-4 text-sm">&quot;medium&quot;</td>
                  <td className="py-3 text-sm">iPhone frame size variant</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-sm text-blue-600">showBackground</td>
                  <td className="py-3 pr-4 text-sm">boolean</td>
                  <td className="py-3 pr-4 text-sm">true</td>
                  <td className="py-3 text-sm">Show gradient background container</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

