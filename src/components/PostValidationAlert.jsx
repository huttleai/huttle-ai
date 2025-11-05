import { AlertTriangle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { validatePost, checkPlatformConnections } from '../utils/socialConnectionChecker';
import { useNotifications } from '../context/NotificationContext';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function PostValidationAlert({ post, onFix }) {
  const { addConnectionWarning } = useNotifications();
  const { user } = useContext(AuthContext);
  const [connectionCheck, setConnectionCheck] = useState({ allConnected: true, unconnected: [] });
  
  const validation = validatePost(post);

  // Load connection check asynchronously
  useEffect(() => {
    const loadConnections = async () => {
      const result = await checkPlatformConnections(post, user?.id);
      setConnectionCheck(result || { allConnected: true, unconnected: [] });
    };
    loadConnections();
  }, [post, user?.id]);

  if (validation.isValid && connectionCheck.allConnected && validation.warnings.length === 0) {
    return null; // No issues
  }

  return (
    <div className="space-y-2 mb-4">
      {/* Errors */}
      {validation.errors && validation.errors.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">Cannot post - please fix:</h4>
              <ul className="space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i} className="text-sm text-red-700">• {error}</li>
                ))}
              </ul>
              {onFix && (
                <button
                  onClick={onFix}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
                >
                  Fix Issues
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Warnings */}
      {!connectionCheck.allConnected && connectionCheck.unconnected && connectionCheck.unconnected.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-2">Platforms not connected:</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {connectionCheck.unconnected.map((platform) => (
                  <span
                    key={platform}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium"
                  >
                    {platform}
                  </span>
                ))}
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                You can still download and post manually, or connect accounts to quickly copy content and open posting interfaces.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.href = '/settings'}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all text-sm font-medium"
                >
                  Connect Accounts
                </button>
                <button
                  onClick={() => {
                    connectionCheck.unconnected.forEach(platform => {
                      addConnectionWarning(platform);
                    });
                  }}
                  className="px-4 py-2 bg-white border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-all text-sm font-medium"
                >
                  Remind Me Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings && validation.warnings.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Suggestions to improve your post:</h4>
              <ul className="space-y-1">
                {validation.warnings.map((warning, i) => (
                  <li key={i} className="text-sm text-blue-700">• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}