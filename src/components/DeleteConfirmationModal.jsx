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
        <div className="relative px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Main Message */}
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">
              {message}
            </p>
            {itemName && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Item:</span> {itemName}
                </p>
              </div>
            )}
          </div>

          {/* Warning Box */}
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 pt-0.5">
                {content.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  This action cannot be undone
                </p>
                <p className="text-sm text-red-700">
                  {content.warning}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {content.cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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

