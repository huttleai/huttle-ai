import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Content",
  message = "This will permanently delete this content from your library.",
  itemName = "",
  type = "content", // 'content' or 'project'
  isDeleting = false 
}) {
  if (!isOpen) return null;

  const getTypeSpecificContent = () => {
    if (type === 'project') {
      return {
        icon: <Trash2 className="w-6 h-6" />,
        warning: "All content in this project will remain in your library, but will no longer be associated with this project.",
        actionText: "Yes, Delete Project",
        cancelText: "No, Keep Project"
      };
    }
    
    return {
      icon: <Trash2 className="w-6 h-6" />,
      warning: "This file will be permanently removed from your storage and cannot be recovered.",
      actionText: "Yes, Delete Permanently",
      cancelText: "No, Keep Content"
    };
  };

  const content = getTypeSpecificContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slideUp">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-600">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="absolute right-6 top-6 p-2 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Main Message */}
          <div className="space-y-3">
            <p className="text-gray-700 font-medium leading-relaxed">
              {message}
            </p>
            {itemName && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">Item:</span> {itemName}
                </p>
              </div>
            )}
          </div>

          {/* Warning Box */}
          <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex gap-3">
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-3 h-3 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900 mb-0.5">
                This action cannot be undone
              </p>
              <p className="text-sm text-red-700 leading-snug">
                {content.warning}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {content.cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-red-600/20"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{content.actionText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

