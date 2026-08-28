import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function DirectorsCutSection({ data, sectionNumber }) {
  const [expandedScenes, setExpandedScenes] = useState({ 0: true });

  if (!data) return null;

  const scenes = data.scenes || data.breakdown || (Array.isArray(data) ? data : []);
  const estimatedRuntime = data.estimated_runtime || data.runtime || '';

  if (scenes.length === 0) return null;

  return (
    <BlueprintSectionWrapper
      icon="🎬"
      title="Director's Cut"
      badge={estimatedRuntime || `${scenes.length} scenes`}
      sectionNumber={sectionNumber}
    >
      <div className="space-y-3">
        {scenes.map((scene, i) => {
          const isExpanded = expandedScenes[i] ?? false;
          const shotType = scene.shot_type || scene.type || '';
          const onScreenText = scene.on_screen_text || scene.text_overlay || '';
          const action = scene.action || scene.action_description || scene.description || '';
          const bRoll = scene.b_roll_suggestion || scene.b_roll || '';

          return (
            <div key={i} className="bg-white/80 rounded-xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedScenes(prev => ({ ...prev, [i]: !prev[i] }))}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-800 to-gray-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">Scene {i + 1}{shotType ? ` — ${shotType}` : ''}</p>
                </div>
                {bRoll && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">B-Roll</span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {onScreenText && (
                    <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100/50">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">On-Screen Text</p>
                      <p className="text-sm text-gray-800">{onScreenText}</p>
                    </div>
                  )}
                  {action && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Action</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{action}</p>
                    </div>
                  )}
                  {bRoll && (
                    <div className="flex items-start gap-2 p-3 bg-indigo-50/60 rounded-lg border border-indigo-100/50">
                      <span className="text-sm">🎞️</span>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">B-Roll Suggestion</p>
                        <p className="text-sm text-gray-700">{bRoll}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {estimatedRuntime && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
          <span className="text-sm">⏱️</span>
          <span className="text-xs font-semibold text-gray-500">Est. Runtime: <span className="text-gray-900">{estimatedRuntime}</span></span>
        </div>
      )}
    </BlueprintSectionWrapper>
  );
}
