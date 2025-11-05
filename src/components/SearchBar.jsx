import { Search } from 'lucide-react';

export default function SearchBar({ placeholder = "Search...", value, onChange, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent transition-all outline-none"
      />
    </div>
  );
}

