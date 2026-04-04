import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import BlueprintSectionWrapper from './BlueprintSectionWrapper';

function CopyTierButton({ hashtags, label }) {
  const [copied, setCopied] = useState(false);
  const text = hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');

  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/80 hover:bg-white border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 transition-all"
    >
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

const TIER_CONFIG = {
  niche: { label: 'Niche', color: 'emerald', desc: 'High relevance, targeted reach' },
  mid: { label: 'Mid-Range', color: 'blue', desc: 'Balanced reach & relevance' },
  broad: { label: 'Broad', color: 'purple', desc: 'High volume, wide reach' },
};

export default function HashtagStrategySection({ data, sectionNumber }) {
  const [copiedTag, setCopiedTag] = useState(null);

  const handleCopyTag = async (tag) => {
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedTag(formatted);
      setTimeout(() => setCopiedTag(null), 1500);
    } catch {
      // silent fail — secondary shortcut action
    }
  };

  if (!data) return null;

  const tiers = data.tiers || {};
  const allHashtags = [];

  const tierKeys = ['niche', 'mid', 'broad'];
  const hasTiers = tierKeys.some(k => tiers[k]);

  if (!hasTiers) {
    const flatHashtags = data.hashtags || data.tags || (Array.isArray(data) ? data : []);
    if (flatHashtags.length === 0) return null;

    return (
      <BlueprintSectionWrapper icon="#️⃣" title="Hashtag Strategy" sectionNumber={sectionNumber}>
        <div className="flex flex-wrap gap-2">
          {flatHashtags.map((tag, i) => {
            const formatted = tag.startsWith('#') ? tag : `#${tag}`;
            return (
              <span
                key={i}
                className="px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-full text-xs font-semibold text-emerald-700 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => handleCopyTag(tag)}
              >
                {copiedTag === formatted ? 'Copied!' : formatted}
              </span>
            );
          })}
        </div>
        <CopyTierButton hashtags={flatHashtags} label="Copy All" />
      </BlueprintSectionWrapper>
    );
  }

  return (
    <BlueprintSectionWrapper icon="#️⃣" title="Hashtag Strategy" sectionNumber={sectionNumber}>
      <div className="space-y-4">
        {tierKeys.map(tierKey => {
          const tier = tiers[tierKey];
          if (!tier) return null;

          const config = TIER_CONFIG[tierKey];
          const hashtags = tier.hashtags || tier.tags || (Array.isArray(tier) ? tier : []);
          const reachRange = tier.reach_range || tier.estimated_reach || '';

          hashtags.forEach(h => allHashtags.push(h));

          const colorMap = {
            emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            blue: { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
            purple: { bg: 'bg-purple-50', border: 'border-purple-200/60', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
          };
          const c = colorMap[config.color];

          return (
            <div key={tierKey} className={`p-4 ${c.bg} rounded-xl border ${c.border}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.badge}`}>{config.label}</span>
                  {reachRange && <span className="text-[10px] text-gray-500">{reachRange}</span>}
                </div>
                <CopyTierButton hashtags={hashtags} label={`Copy ${config.label}`} />
              </div>
              <p className="text-[10px] text-gray-500 mb-2">{config.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag, i) => {
                  const formatted = tag.startsWith('#') ? tag : `#${tag}`;
                  return (
                    <span
                      key={i}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.text} bg-white/80 border ${c.border} cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => handleCopyTag(tag)}
                    >
                      {copiedTag === formatted ? 'Copied!' : formatted}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {allHashtags.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <CopyTierButton hashtags={allHashtags} label="Copy All Hashtags" />
        </div>
      )}
    </BlueprintSectionWrapper>
  );
}
