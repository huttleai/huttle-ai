import { useState } from 'react';
import { X, Folder, Sparkles } from 'lucide-react';

const PROJECT_COLORS = [
  { name: 'Indigo', value: '#6366f1', lightBg: 'bg-indigo-100', darkBg: 'bg-indigo-500' },
  { name: 'Purple', value: '#a855f7', lightBg: 'bg-purple-100', darkBg: 'bg-purple-500' },
  { name: 'Pink', value: '#ec4899', lightBg: 'bg-pink-100', darkBg: 'bg-pink-500' },
  { name: 'Rose', value: '#f43f5e', lightBg: 'bg-rose-100', darkBg: 'bg-rose-500' },
  { name: 'Orange', value: '#f97316', lightBg: 'bg-orange-100', darkBg: 'bg-orange-500' },
  { name: 'Amber', value: '#f59e0b', lightBg: 'bg-amber-100', darkBg: 'bg-amber-500' },
  { name: 'Emerald', value: '#10b981', lightBg: 'bg-emerald-100', darkBg: 'bg-emerald-500' },
  { name: 'Teal', value: '#14b8a6', lightBg: 'bg-teal-100', darkBg: 'bg-teal-500' },
  { name: 'Cyan', value: '#06b6d4', lightBg: 'bg-cyan-100', darkBg: 'bg-cyan-500' },
  { name: 'Blue', value: '#3b82f6', lightBg: 'bg-blue-100', darkBg: 'bg-blue-500' },
];

export default function CreateProjectModal({ isOpen, onClose, onSave, initialData = null, isEditing = false }) {
  const [projectName, setProjectName] = useState(initialData?.name || '');
  const [projectDescription, setProjectDescription] = useState(initialData?.description || '');
  const [selectedColor, setSelectedColor] = useState(initialData?.color || PROJECT_COLORS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSave({
        name: projectName.trim(),
        description: projectDescription.trim(),
        color: selectedColor,
      });
      
      // Reset form
      setProjectName('');
      setProjectDescription('');
      setSelectedColor(PROJECT_COLORS[0].value);
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setProjectName('');
      setProjectDescription('');
      setSelectedColor(PROJECT_COLORS[0].value);
      onClose();
    }
  };

  const selectedColorObj = PROJECT_COLORS.find(c => c.value === selectedColor) || PROJECT_COLORS[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all animate-slideUp">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border border-gray-100 ${selectedColorObj.lightBg}`}>
              <Folder className="w-6 h-6" style={{ color: selectedColor }} />
            </div>
            <h2 className="text-2xl font-bold text-huttle-primary">
              {isEditing ? 'Edit Project' : 'New Project'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute right-6 top-6 p-2 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Summer Campaign 2024"
              maxLength={50}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary transition-all text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm"
            />
            <div className="mt-1.5 text-xs text-gray-400 text-right font-medium">
              {projectName.length}/50
            </div>
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Description <span className="text-gray-400 text-xs font-normal normal-case">(Optional)</span>
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Add a brief description of your project..."
              rows={3}
              maxLength={200}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary transition-all text-gray-900 placeholder-gray-400 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm"
            />
            <div className="mt-1.5 text-xs text-gray-400 text-right font-medium">
              {projectDescription.length}/200
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
              Project Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  disabled={isSubmitting}
                  className={`relative h-12 rounded-xl transition-all transform hover:scale-105 ${
                    color.lightBg
                  } ${
                    selectedColor === color.value 
                      ? 'ring-2 ring-offset-2 scale-105 shadow-md' 
                      : 'hover:shadow-sm border border-transparent hover:border-black/5'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  style={{ 
                    ringColor: selectedColor === color.value ? color.value : undefined 
                  }}
                  title={color.name}
                >
                  <div 
                    className={`absolute inset-2 rounded-lg ${color.darkBg} shadow-sm`}
                    style={{ backgroundColor: color.value }}
                  />
                  {selectedColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-inner">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Preview</p>
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: selectedColor }}
              >
                <Folder className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">
                  {projectName || 'Project Name'}
                </p>
                {projectDescription && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {projectDescription}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!projectName.trim() || isSubmitting}
              className="flex-1 px-4 py-3 bg-huttle-primary text-white rounded-xl font-bold hover:bg-huttle-primary-dark hover:shadow-lg hover:shadow-huttle-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isEditing ? 'Update Project' : 'Create Project'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

