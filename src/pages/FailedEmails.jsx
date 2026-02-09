import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Copy, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Mail,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Card, Button, Alert, LoadingSpinner } from '../components/UI';
import { campaignService, contactsService } from '../services/supabase';

export default function FailedEmails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaignId');
  
  const [failedEmails, setFailedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    if (campaignId) {
      loadFailedEmails();
    } else {
      setError('No campaign specified');
      setLoading(false);
    }
  }, [campaignId]);

  const loadFailedEmails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [failed, campaignData] = await Promise.all([
        campaignService.getFailedEmails(campaignId),
        campaignService.getById(campaignId),
      ]);
      
      setFailedEmails(failed || []);
      setCampaign(campaignData);
    } catch (err) {
      setError('Failed to load failed emails: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    const emails = failedEmails.map(f => f.email || f.contact_email).join('\n');
    navigator.clipboard.writeText(emails);
    setSuccess('All failed emails copied to clipboard');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCopySelected = () => {
    const emails = failedEmails
      .filter(f => selectedEmails.includes(f.id))
      .map(f => f.email || f.contact_email)
      .join('\n');
    navigator.clipboard.writeText(emails);
    setSuccess(`${selectedEmails.length} email(s) copied to clipboard`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCopySingle = (email) => {
    navigator.clipboard.writeText(email);
    setSuccess('Email copied to clipboard');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleExportCSV = () => {
    const csvContent = [
      'Email,Name,Error',
      ...failedEmails.map(f => {
        const email = f.email || f.contact_email || '';
        const name = f.contact_data?.firstName 
          ? `${f.contact_data.firstName} ${f.contact_data.lastName || ''}`.trim() 
          : (f.contact_name || '');
        const error = (f.error_message || '').replace(/"/g, '""');
        return `"${email}","${name}","${error}"`;
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `failed_emails_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setSuccess('Failed emails exported to CSV');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRemoveFromContacts = async () => {
    if (selectedEmails.length === 0) {
      setError('Please select emails to remove');
      return;
    }

    try {
      const emailsToRemove = failedEmails
        .filter(f => selectedEmails.includes(f.id))
        .map(f => f.email || f.contact_email);
      
      for (const email of emailsToRemove) {
        await contactsService.deleteByEmail(email);
      }
      
      setSuccess(`${emailsToRemove.length} email(s) removed from contacts`);
      setSelectedEmails([]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to remove contacts: ' + err.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmails.length === failedEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(failedEmails.map(f => f.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedEmails(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/send')}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Failed Emails</h2>
          <p className="text-stone-500 mt-1">
            {campaign?.name || 'Campaign'} - {failedEmails.length} failed email{failedEmails.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {failedEmails.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-stone-900">No Failed Emails</h3>
            <p className="text-stone-500 mt-2">All emails in this campaign were sent successfully.</p>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/send')}
              className="mt-6"
            >
              Back to Send Emails
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Action Bar */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmails.length === failedEmails.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                  />
                  <span className="text-sm text-stone-600">
                    {selectedEmails.length > 0 
                      ? `${selectedEmails.length} selected`
                      : 'Select all'
                    }
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadFailedEmails}
                  title="Refresh list"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportCSV}
                  title="Export as CSV"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                
                {selectedEmails.length > 0 ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopySelected}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Selected
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleRemoveFromContacts}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove from Contacts
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyAll}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy All
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Failed Emails List */}
          <Card>
            <div className="divide-y divide-stone-100">
              {failedEmails.map((failed) => {
                const email = failed.email || failed.contact_email;
                const name = failed.contact_data?.firstName 
                  ? `${failed.contact_data.firstName} ${failed.contact_data.lastName || ''}`.trim()
                  : (failed.contact_name || '');
                  
                return (
                  <div 
                    key={failed.id}
                    className={`flex items-start gap-4 p-4 hover:bg-stone-50 transition-colors ${
                      selectedEmails.includes(failed.id) ? 'bg-stone-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(failed.id)}
                      onChange={() => toggleSelect(failed.id)}
                      className="w-4 h-4 mt-1 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <span className="font-medium text-stone-900 truncate">
                          {email}
                        </span>
                      </div>
                      
                      {name && (
                        <p className="text-sm text-stone-500 mt-1">{name}</p>
                      )}
                      
                      {failed.error_message && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700">{failed.error_message}</p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleCopySingle(email)}
                      className="p-2 hover:bg-stone-200 rounded-lg transition-colors flex-shrink-0"
                      title="Copy email"
                    >
                      <Copy className="w-4 h-4 text-stone-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">How to retry failed emails</p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Copy the failed emails and verify they are correct</li>
                  <li>Check if the email addresses have any typos</li>
                  <li>Remove invalid emails from your contacts list</li>
                  <li>Start a new campaign with the corrected contacts</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
