import { useState } from 'react';
import { AlertTriangle, Copy, Trash2, Mail, FileText, CheckCircle, XCircle } from 'lucide-react';

/**
 * DuplicateDialog - Shows detected duplicates and asks for user action
 * 
 * Used for both contacts and templates when duplicates are detected
 */
export default function DuplicateDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  type = 'contacts', // 'contacts' or 'templates'
  duplicates = [],
  duplicatesWithExisting = [],
  uniqueCount = 0,
  invalidItems = [], // For contacts with invalid emails
}) {
  const [loading, setLoading] = useState(false);
  
  if (!isOpen) return null;

  const totalDuplicates = duplicates.length + duplicatesWithExisting.length;
  const hasInvalidEmails = invalidItems.length > 0;
  const Icon = type === 'contacts' ? Mail : FileText;
  
  async function handleConfirm(includeInvalid = false) {
    setLoading(true);
    try {
      await onConfirm(includeInvalid);
      onClose();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-stone-900/50 transition-opacity" 
          onClick={loading ? undefined : handleCancel}
          aria-hidden="true"
        />
        
        {/* Dialog */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 transform transition-all max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                {hasInvalidEmails ? 'Validation Issues Found' : 'Duplicates Detected'}
              </h3>
              <p className="text-sm text-stone-500">
                Review before proceeding
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-green-700">{uniqueCount}</p>
              <p className="text-xs text-green-600">Valid & Unique</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <Copy className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-amber-700">{totalDuplicates}</p>
              <p className="text-xs text-amber-600">Duplicates</p>
            </div>
            {type === 'contacts' && (
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-semibold text-red-700">{invalidItems.length}</p>
                <p className="text-xs text-red-600">Invalid Emails</p>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[40vh]">
            {/* Invalid Emails Section */}
            {hasInvalidEmails && (
              <div className="bg-red-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Invalid Email Addresses ({invalidItems.length})
                </h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {invalidItems.slice(0, 10).map((item, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="font-mono text-xs bg-red-100 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                        {item.email || item}
                      </span>
                      <span className="text-red-600 text-xs">{item.validationError}</span>
                      {item.suggestion && (
                        <span className="text-green-600 text-xs">→ {item.suggestion}</span>
                      )}
                    </li>
                  ))}
                  {invalidItems.length > 10 && (
                    <li className="text-xs text-red-600">
                      ...and {invalidItems.length - 10} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Duplicates with Existing */}
            {duplicatesWithExisting.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Already Exist ({duplicatesWithExisting.length})
                </h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {duplicatesWithExisting.slice(0, 10).map((item, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-amber-500" />
                      <span className="truncate">
                        {type === 'contacts' 
                          ? (item.email || item)
                          : (item.name || item.subject?.slice(0, 40) + '...')
                        }
                      </span>
                    </li>
                  ))}
                  {duplicatesWithExisting.length > 10 && (
                    <li className="text-xs text-amber-600">
                      ...and {duplicatesWithExisting.length - 10} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Duplicates within Import */}
            {duplicates.length > 0 && (
              <div className="bg-stone-100 rounded-lg p-3">
                <h4 className="text-sm font-medium text-stone-800 mb-2 flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Duplicates in Import ({duplicates.length})
                </h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {duplicates.slice(0, 10).map((item, i) => (
                    <li key={i} className="text-sm text-stone-600 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-stone-400" />
                      <span className="truncate">
                        {type === 'contacts' 
                          ? (item.email || item)
                          : (item.name || item.subject?.slice(0, 40) + '...')
                        }
                      </span>
                    </li>
                  ))}
                  {duplicates.length > 10 && (
                    <li className="text-xs text-stone-500">
                      ...and {duplicates.length - 10} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              {uniqueCount > 0 ? (
                <>
                  <strong>{uniqueCount}</strong> valid {type} will be added.
                  {totalDuplicates > 0 && ` ${totalDuplicates} duplicate${totalDuplicates !== 1 ? 's' : ''} will be skipped.`}
                  {hasInvalidEmails && ` ${invalidItems.length} invalid email${invalidItems.length !== 1 ? 's' : ''} will be excluded.`}
                </>
              ) : (
                <>No valid {type} to add. All items are duplicates or invalid.</>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500 disabled:opacity-50"
            >
              Cancel
            </button>
            {uniqueCount > 0 && (
              <button
                onClick={() => handleConfirm(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:bg-stone-400"
              >
                {loading ? 'Adding...' : `Add ${uniqueCount} Valid ${type === 'contacts' ? 'Contact' : 'Template'}${uniqueCount !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
