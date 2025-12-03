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
    ? `bg-gradient-to-br from-${gradientFrom} to-${gradientTo}` 
    : bgColor;
  
  const iconTextClass = gradientFrom ? 'text-white' : iconColor;

  return (
    <div className="card card-hover p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBgClass} flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110`}>
          <IconComponent className={`w-6 h-6 ${iconTextClass}`} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            trend.type === 'up' 
              ? 'bg-green-100 text-green-700' 
              : trend.type === 'down' 
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className={`text-2xl font-display font-bold ${valueColor}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
