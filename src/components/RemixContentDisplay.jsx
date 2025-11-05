import { useState } from 'react';
import { Lightbulb, Copy, Check, Sparkles, ArrowRight, Instagram, Linkedin as LinkedIn, Music } from 'lucide-react';

/**
 * RemixContentDisplay Component
 * Displays remixed content ideas in beautiful, separate boxes for each idea
 */
export default function RemixContentDisplay({ content, onCopy, copiedIdea, onClearAndRemix }) {
  const [expandedIdea, setExpandedIdea] = useState(null);

  // Parse the content to extract individual ideas
  const parseRemixContent = (text) => {
    if (!text) return [];
    
    const ideas = [];
    
    // Try to parse structured content (looking for "### Idea" patterns)
    const ideaMatches = text.match(/###\s*Idea\s*\d+:.*?(?=###\s*Idea|\n*$)/gs);
    
    if (ideaMatches && ideaMatches.length > 0) {
      ideaMatches.forEach((ideaBlock, index) => {
        const titleMatch = ideaBlock.match(/###\s*Idea\s*\d+:\s*(.*?)(?:\n|$)/);
        const title = titleMatch ? titleMatch[1].trim() : `Idea ${index + 1}`;
        
        // Extract core concept
        const conceptMatch = ideaBlock.match(/\*\*Core Concept\*\*:\s*(.*?)(?:\n|$)/s);
        const concept = conceptMatch ? conceptMatch[1].trim() : '';
        
        // Extract platform variations
        const variations = [];
        
        // Instagram
        const instagramMatch = ideaBlock.match(/\*\*Instagram.*?\*\*:(.*?)(?=\*\*LinkedIn|\*\*TikTok|\n\n|$)/s);
        if (instagramMatch) {
          variations.push({
            platform: 'Instagram',
            icon: Instagram,
            content: instagramMatch[1].trim()
          });
        }
        
        // LinkedIn
        const linkedinMatch = ideaBlock.match(/\*\*LinkedIn.*?\*\*:(.*?)(?=\*\*Instagram|\*\*TikTok|\n\n|$)/s);
        if (linkedinMatch) {
          variations.push({
            platform: 'LinkedIn',
            icon: LinkedIn,
            content: linkedinMatch[1].trim()
          });
        }
        
        // TikTok
        const tiktokMatch = ideaBlock.match(/\*\*TikTok.*?\*\*:(.*?)(?=\*\*Instagram|\*\*LinkedIn|\n\n|$)/s);
        if (tiktokMatch) {
          variations.push({
            platform: 'TikTok',
            icon: Music,
            content: tiktokMatch[1].trim()
          });
        }
        
        ideas.push({
          id: index,
          title,
          concept,
          variations,
          fullContent: ideaBlock
        });
      });
    } else {
      // Fallback: split by double newlines or numbered patterns
      const sections = text.split(/\n\n+|\d+\.\s+/).filter(s => s.trim().length > 50);
      sections.forEach((section, index) => {
        ideas.push({
          id: index,
          title: `Remix Idea ${index + 1}`,
          concept: section.trim().substring(0, 150) + '...',
          variations: [],
          fullContent: section.trim()
        });
      });
    }
    
    return ideas.length > 0 ? ideas : [{
      id: 0,
      title: 'Remixed Content',
      concept: '',
      variations: [],
      fullContent: text
    }];
  };

  const ideas = parseRemixContent(content);

  const getPlatformColor = (platform) => {
    const colors = {
      'Instagram': 'from-pink-500 to-purple-500',
      'LinkedIn': 'from-blue-600 to-blue-700',
      'TikTok': 'from-black to-cyan-500'
    };
    return colors[platform] || 'from-gray-500 to-gray-600';
  };

  const getPlatformBadgeColor = (platform) => {
    const colors = {
      'Instagram': 'bg-gradient-to-r from-pink-500 to-purple-500',
      'LinkedIn': 'bg-blue-600',
      'TikTok': 'bg-black'
    };
    return colors[platform] || 'bg-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-orange-500" />
          <h4 className="font-semibold text-gray-900">Remixed Content Ideas</h4>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
            {ideas.length} {ideas.length === 1 ? 'Idea' : 'Ideas'}
          </span>
        </div>
        <button
          onClick={onClearAndRemix}
          className="text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium flex items-center gap-1"
        >
          <Sparkles className="w-4 h-4" />
          Remix Again
        </button>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 gap-4">
        {ideas.map((idea, index) => (
          <div
            key={idea.id}
            className="bg-white rounded-xl border-2 border-orange-200 hover:border-orange-400 transition-all shadow-sm hover:shadow-md overflow-hidden"
          >
            {/* Idea Header */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 border-b border-orange-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-bold text-gray-900 text-lg mb-1">{idea.title}</h5>
                  {idea.concept && (
                    <p className="text-sm text-gray-700 leading-relaxed">{idea.concept}</p>
                  )}
                </div>
                <button
                  onClick={() => onCopy(idea.fullContent, index)}
                  className="ml-4 flex items-center gap-2 px-3 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all text-sm font-medium shadow-sm"
                >
                  {copiedIdea === `remix-${index}` ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Platform Variations */}
            {idea.variations.length > 0 ? (
              <div className="p-4">
                <div className="space-y-3">
                  {idea.variations.map((variation, vIndex) => {
                    const Icon = variation.icon;
                    return (
                      <div
                        key={vIndex}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getPlatformColor(variation.platform)} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className={`text-xs font-bold text-white px-3 py-1 rounded-full ${getPlatformBadgeColor(variation.platform)}`}>
                            {variation.platform}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pl-10">
                          {variation.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {idea.fullContent.length > 500 && !expandedIdea 
                      ? idea.fullContent.substring(0, 500) + '...' 
                      : idea.fullContent}
                  </p>
                  {idea.fullContent.length > 500 && (
                    <button
                      onClick={() => setExpandedIdea(expandedIdea === idea.id ? null : idea.id)}
                      className="mt-3 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium flex items-center gap-1"
                    >
                      {expandedIdea === idea.id ? 'Show Less' : 'Read More'}
                      <ArrowRight className={`w-4 h-4 transition-transform ${expandedIdea === idea.id ? 'rotate-90' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 Each idea is tailored to match your brand voice and optimized for different platforms
        </p>
        <button
          onClick={onClearAndRemix}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          Clear & Remix Again
        </button>
      </div>
    </div>
  );
}

