import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function VisualCompositionSection({ data, sectionNumber }) {
  if (!data) return null;

  const framing = data.shot_framing || data.framing || '';
  const colorPalette = data.color_palette || [];
  const lightingStyle = data.lighting_style || data.lighting || '';
  const compositionRule = data.composition_rule || data.composition || '';
  const propsEnv = data.props_environment || data.props || [];
  const whatNot = data.what_not_to_do || data.avoid || '';

  return (
    <BlueprintSectionWrapper icon="📸" title="Visual Composition" sectionNumber={sectionNumber}>
      <div className="space-y-4">
        {framing && (
          <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100/50">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Shot Framing</p>
            <p className="text-gray-800 font-medium">{framing}</p>
          </div>
        )}

        {colorPalette.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Color Palette</p>
            <div className="flex flex-wrap gap-2">
              {colorPalette.map((color, i) => {
                const hex = typeof color === 'string' ? color : (color.hex || color.color || '');
                const label = typeof color === 'object' ? color.name : '';
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    {hex.startsWith('#') && (
                      <div className="w-5 h-5 rounded-full border border-gray-200 shadow-inner" style={{ backgroundColor: hex }} />
                    )}
                    <span className="text-xs font-mono font-medium text-gray-600">{label || hex}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lightingStyle && (
          <div className="flex items-center gap-2">
            <span className="text-sm">💡</span>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lighting</p>
              <p className="text-sm text-gray-700">{lightingStyle}</p>
            </div>
          </div>
        )}

        {compositionRule && (
          <div className="flex items-center gap-2">
            <span className="text-sm">📐</span>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Composition Rule</p>
              <p className="text-sm text-gray-700">{compositionRule}</p>
            </div>
          </div>
        )}

        {propsEnv.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Props & Environment</p>
            <ul className="space-y-1">
              {(Array.isArray(propsEnv) ? propsEnv : [propsEnv]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 mt-0.5">•</span>
                  {typeof item === 'string' ? item : item.description || JSON.stringify(item)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {whatNot && (
          <div className="p-4 bg-red-50/60 rounded-xl border border-red-200/50">
            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">⚠️ What NOT to Do</p>
            <p className="text-sm text-red-700 leading-relaxed">{typeof whatNot === 'string' ? whatNot : (Array.isArray(whatNot) ? whatNot.join('; ') : '')}</p>
          </div>
        )}
      </div>
    </BlueprintSectionWrapper>
  );
}
