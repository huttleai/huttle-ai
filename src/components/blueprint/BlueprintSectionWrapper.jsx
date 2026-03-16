import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function BlueprintSectionWrapper({ icon, title, badge, sectionNumber, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/70 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 animate-slideUp"
      style={{ animationDelay: `${(sectionNumber || 0) * 80}ms` }}
    >
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between gap-3 p-5 bg-gradient-to-r from-gray-50/80 to-white/60 border-b border-gray-100/50 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {sectionNumber && (
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-xs shadow-md">
              {sectionNumber}
            </div>
          )}
          <span className="text-lg flex-shrink-0">{icon}</span>
          <h3 className="font-bold text-gray-900 text-sm md:text-base truncate">{title}</h3>
          {badge && (
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="p-5 md:p-6">
          {children}
        </div>
      )}
    </div>
  );
}
