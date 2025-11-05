export default function StatCard({ 
  icon: IconComponent, // eslint-disable-line no-unused-vars
  title, 
  value, 
  iconColor = 'text-huttle-primary', 
  bgColor = 'bg-cyan-50',
  valueColor = 'text-gray-900',
  subtitle = null,
  trend = null
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center`}>
          <IconComponent className={`w-6 h-6 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded ${
            trend.type === 'up' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

