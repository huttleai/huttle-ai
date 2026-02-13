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
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto transform transition-all animate-slideUp">
        {/* Header */}
        <div className="relative px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border border-gray-100 ${selectedColorObj.lightBg}`}>
              <Folder className="w-4 h-4" style={{ color: selectedColor }} />
            </div>
            <h2 className="text-lg font-bold text-huttle-primary">
              {isEditing ? 'Edit Project' : 'New Project'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute right-4 top-3 p-1.5 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary transition-all text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <div className="mt-1 text-[10px] text-gray-400 text-right">
              {projectName.length}/50
            </div>
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description <span className="text-gray-400 text-[10px] font-normal">(Optional)</span>
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Brief description..."
              rows={2}
              maxLength={200}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary transition-all text-gray-900 placeholder-gray-400 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Color Selection - Compact inline */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  disabled={isSubmitting}
                  className={`w-7 h-7 rounded-full transition-all ${
                    selectedColor === color.value 
                      ? 'ring-2 ring-offset-1 scale-110 shadow-sm' 
                      : 'hover:scale-105'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{ 
                    backgroundColor: color.value,
                    ringColor: selectedColor === color.value ? color.value : undefined 
                  }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Compact Preview */}
          <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: selectedColor }}
            >
              <Folder className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {projectName || 'Project Name'}
              </p>
              {projectDescription && (
                <p className="text-xs text-gray-500 truncate">
                  {projectDescription}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!projectName.trim() || isSubmitting}
              className="flex-1 px-3 py-2 text-sm bg-huttle-primary text-white rounded-lg font-medium hover:bg-huttle-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Update' : 'Create'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

