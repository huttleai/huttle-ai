export default function StatCard({ 
  icon: IconComponent,
  title, 
  value, 
  iconColor = 'text-huttle-primary', 
  bgColor = 'bg-cyan-50',
  gradientFrom = null,
  gradientTo = null,
  valueColor = 'text-gray-900',
  subtitle = null,
  trend = null
}) {
  // Use gradient if provided, otherwise use solid bgColor
  const iconBgClass = gradientFrom && gradientTo 
    ? `bg-white border border-gray-100` 
    : 'bg-white border border-gray-100';
  
  // Always use the primary color for the icon itself in the new design
  const iconTextClass = iconColor || 'text-huttle-primary';

  return (
    <div className="card card-hover p-5 group transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${iconBgClass} flex items-center justify-center shadow-subtle group-hover:shadow-md transition-all duration-300 group-hover:scale-110`}>
          <IconComponent className={`w-5 h-5 ${iconTextClass}`} />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            trend.type === 'up' 
              ? 'bg-green-50 text-green-700' 
              : trend.type === 'down' 
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
      <p className={`text-2xl font-display font-bold text-gray-900`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
