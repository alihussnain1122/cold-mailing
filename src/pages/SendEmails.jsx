import { useEffect, useState } from 'react';
import { Play, Square, Send, Clock, CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react';
import { Card, Button, Input, Alert, Badge } from '../components/UI';
import { templatesAPI, contactsAPI, sendAPI } from '../services/api';
import { useCampaign } from '../context/CampaignContext';

export default function SendEmails() {
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [senderName, setSenderName] = useState('Ali');
  const [delayMin, setDelayMin] = useState(10);
  const [delayMax, setDelayMax] = useState(90);
  
  const [testEmail, setTestEmail] = useState('');
  const [testTemplateIndex, setTestTemplateIndex] = useState(0);

  // Use campaign context
  const campaign = useCampaign();

  useEffect(() => {
    loadData();
    
    // Reload data when component becomes visible or window gains focus
    const handleFocus = () => {
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [templatesData, contactsData] = await Promise.all([
        templatesAPI.getAll(),
        contactsAPI.getAll(),
      ]);
      setTemplates(templatesData);
      setContacts(contactsData);
      
      // Only auto-select all if none are selected
      if (selectedTemplates.length === 0) {
        setSelectedTemplates(templatesData.map((_, i) => i));
      }
      if (selectedContacts.length === 0) {
        setSelectedContacts(contactsData);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (selectedContacts.length === 0) {
      setError('Please select at least one contact');
      return;
    }
    if (selectedTemplates.length === 0) {
      setError('Please select at least one template');
      return;
    }

    setError('');
    setSuccess('');
    
    const selectedTemplateObjects = selectedTemplates.map(i => templates[i]).filter(Boolean);

    // Prepare campaign data with template rotation
    const campaignContacts = selectedContacts.map((contact, index) => {
      const templateIndex = index % selectedTemplateObjects.length;
      const template = selectedTemplateObjects[templateIndex];
      return {
        email: contact.email || contact,
        name: contact.name || '',
        company: contact.company || '',
        template
      };
    });

    // Start campaign using context
    campaign.startCampaign(
      campaignContacts,
      { delayMin: delayMin * 1000, delayMax: delayMax * 1000 } // Convert to milliseconds
    );

    setSuccess('Campaign started! You can navigate to other pages while it runs.');
  }

  function handleStop() {
    campaign.stopCampaign();
  }

  function handleReset() {
    campaign.resetCampaign();
    setSuccess('');
    setError('');
  }

  async function handleTestEmail() {
    if (!testEmail || !testEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    try {
      await sendAPI.test(testEmail, testTemplateIndex);
      setSuccess(`Test email sent to ${testEmail}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleTemplate(index) {
    setSelectedTemplates(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const progressPercent = campaign.total > 0 ? (campaign.sent / campaign.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Send Emails</h2>
          <p className="text-gray-500 mt-1">Configure and start your email campaign</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card title="Campaign Configuration">
          <div className="space-y-4">
            <Input
              label="Sender Name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Name that appears in emails"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min Delay (seconds)"
                type="number"
                value={delayMin}
                onChange={(e) => setDelayMin(e.target.value)}
                min="1"
              />
              <Input
                label="Max Delay (seconds)"
                type="number"
                value={delayMax}
                onChange={(e) => setDelayMax(e.target.value)}
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Templates ({selectedTemplates.length} selected)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {templates.map((template, index) => (
                  <label key={index} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(index)}
                      onChange={() => toggleTemplate(index)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{template.subject}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Recipients: {selectedContacts.length} contacts
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedContacts(
                    selectedContacts.length === contacts.length ? [] : contacts
                  )}
                >
                  {selectedContacts.length === contacts.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {campaign.isRunning ? (
                <>
                  <Button variant="danger" onClick={handleStop} className="flex-1">
                    <Square className="w-4 h-4 mr-2" />
                    Stop Campaign
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleStart} 
                    className="flex-1" 
                    disabled={selectedTemplates.length === 0 || selectedContacts.length === 0 || loading}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Campaign
                  </Button>
                  {campaign.status !== 'idle' && (
                    <Button variant="outline" onClick={handleReset}>
                      Reset
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Test Email */}
        <Card title="Send Test Email">
          <div className="space-y-4">
            <Input
              label="Test Email Address"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to test"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Template
              </label>
              <select
                value={testTemplateIndex}
                onChange={(e) => setTestTemplateIndex(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {templates.map((template, index) => (
                  <option key={index} value={index}>
                    {template.subject}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="secondary" onClick={handleTestEmail} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Send Test Email
            </Button>
          </div>
        </Card>
      </div>

      {/* Progress */}
      {campaign.status !== 'idle' && (
        <Card title="Campaign Progress">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {campaign.isRunning && (
                  <div className="animate-pulse">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                )}
                <Badge variant={
                  campaign.status === 'running' ? 'success' :
                  campaign.status === 'completed' ? 'default' :
                  campaign.status === 'paused' ? 'warning' :
                  'error'
                }>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </div>
              <span className="text-lg font-semibold">
                {campaign.sent || 0} / {campaign.total || 0}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {campaign.currentEmail && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <Mail className="w-4 h-4" />
                <div className="flex-1">
                  <div>Sending to: <strong>{campaign.currentEmail}</strong></div>
                  {campaign.currentTemplate && (
                    <div className="text-xs text-gray-500 mt-1">Template: {campaign.currentTemplate}</div>
                  )}
                </div>
              </div>
            )}

            {campaign.nextEmailIn > 0 && (
              <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 rounded-lg p-3">
                <Clock className="w-4 h-4 animate-pulse" />
                <span className="font-medium">Next email in {campaign.nextEmailIn} seconds</span>
              </div>
            )}

            {campaign.failed > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700">
                  Failed: {campaign.failed}
                </p>
              </div>
            )}

            {campaign.error && (
              <Alert type="error" message={campaign.error} />
            )}

            {campaign.status === 'completed' && (
              <Alert 
                type="success" 
                message={`Campaign completed! Sent ${campaign.sent} emails successfully.`} 
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
