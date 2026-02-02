import { useEffect, useState, useRef } from 'react';
import { Play, Square, Send, Clock, CheckCircle, XCircle, Mail } from 'lucide-react';
import { Card, Button, Input, Alert, Badge } from '../components/UI';
import { templatesAPI, contactsAPI, sendAPI } from '../services/api';

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
  
  // Campaign state (controlled by frontend for Vercel compatibility)
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({
    sent: 0,
    total: 0,
    current: '',
    failed: [],
    logs: [],
    currentTemplate: null,
    delaySeconds: 0,
  });
  const stopRequestedRef = useRef(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress.logs]);

  async function loadData() {
    try {
      const [templatesData, contactsData] = await Promise.all([
        templatesAPI.getAll(),
        contactsAPI.getAll(),
      ]);
      setTemplates(templatesData);
      setContacts(contactsData);
      setSelectedTemplates(templatesData.map((_, i) => i));
      setSelectedContacts(contactsData);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function addLog(message, type = 'info') {
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs, {
        time: new Date().toISOString(),
        message,
        success: type === 'success' ? true : type === 'error' ? false : undefined,
        info: type === 'info',
      }]
    }));
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

    console.log('Starting campaign...');
    console.log('Selected contacts:', selectedContacts);
    console.log('Selected templates:', selectedTemplates);

    setError('');
    setSuccess('');
    setIsSending(true);
    stopRequestedRef.current = false;
    
    const selectedTemplateObjects = selectedTemplates.map(i => templates[i]).filter(Boolean);
    
    setProgress({
      sent: 0,
      total: selectedContacts.length,
      current: '',
      failed: [],
      logs: [],
      currentTemplate: null,
      delaySeconds: 0,
    });

    addLog(`Starting campaign: ${selectedContacts.length} contacts, ${selectedTemplateObjects.length} templates`);

    let templateIndex = 0;
    let sentCount = 0;
    const failedList = [];

    for (let i = 0; i < selectedContacts.length; i++) {
      if (stopRequestedRef.current) {
        addLog('Campaign stopped by user', 'info');
        break;
      }

      const contact = selectedContacts[i];
      const email = contact.email || contact;
      const template = selectedTemplateObjects[templateIndex];
      
      setProgress(prev => ({
        ...prev,
        current: email,
        currentTemplate: {
          index: templateIndex + 1,
          subject: template.subject,
          total: selectedTemplateObjects.length
        }
      }));

      try {
        console.log('Sending email to:', email);
        console.log('Using template:', template.subject);
        const result = await sendAPI.sendSingle(email, template, senderName);
        console.log('Send result:', result);
        sentCount++;
        addLog(`✓ Sent to ${email} (Template #${templateIndex + 1})`, 'success');
        setProgress(prev => ({ ...prev, sent: sentCount }));
      } catch (err) {
        console.error('Send error:', err);
        failedList.push({ email, error: err.message });
        addLog(`✗ Failed for ${email}: ${err.message}`, 'error');
        setProgress(prev => ({ ...prev, failed: failedList }));
      }

      templateIndex = (templateIndex + 1) % selectedTemplateObjects.length;

      // Delay before next email (if not last)
      if (i < selectedContacts.length - 1 && !stopRequestedRef.current) {
        const delay = Math.floor(Math.random() * (delayMax - delayMin) + delayMin);
        setProgress(prev => ({ ...prev, delaySeconds: delay }));
        addLog(`Waiting ${delay} seconds...`, 'info');
        
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
        setProgress(prev => ({ ...prev, delaySeconds: 0 }));
      }
    }

    setProgress(prev => ({
      ...prev,
      current: '',
      currentTemplate: null,
      delaySeconds: 0,
    }));
    
    addLog(`Completed! Sent: ${sentCount}/${selectedContacts.length}, Failed: ${failedList.length}`, 'info');
    setIsSending(false);
    setSuccess(`Campaign completed! Sent ${sentCount} emails.`);
  }

  function handleStop() {
    stopRequestedRef.current = true;
    addLog('Stop requested...', 'info');
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

  const progressPercent = progress.total > 0 ? (progress.sent / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Send Emails</h2>
        <p className="text-gray-500 mt-1">Configure and start your email campaign</p>
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
              {isSending ? (
                <Button variant="danger" onClick={handleStop} className="flex-1">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Sending
                </Button>
              ) : (
                <Button onClick={handleStart} className="flex-1" disabled={templates.length === 0 || contacts.length === 0}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Campaign
                </Button>
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
      {(isSending || progress.sent > 0) && (
        <Card title="Campaign Progress">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSending && (
                  <div className="animate-pulse">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                )}
                <Badge variant={isSending ? 'success' : 'default'}>
                  {isSending ? 'Sending' : 'Completed'}
                </Badge>
              </div>
              <span className="text-lg font-semibold">
                {progress.sent || 0} / {progress.total || 0}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {progress.current && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <Mail className="w-4 h-4" />
                <span>Sending to: <strong>{progress.current}</strong></span>
              </div>
            )}

            {progress.currentTemplate && (
              <div className="text-sm text-gray-500">
                Using template {progress.currentTemplate.index} of {progress.currentTemplate.total}
              </div>
            )}

            {progress.delaySeconds > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Waiting {progress.delaySeconds}s before next email...</span>
              </div>
            )}

            {progress.failed?.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700 mb-2">
                  Failed: {progress.failed.length}
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {progress.failed.map((f, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {f.email}: {f.error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Logs */}
      {progress.logs?.length > 0 && (
        <Card title="Activity Log">
          <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-sm">
            {progress.logs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-2 rounded ${
                  log.success === true ? 'bg-green-50' :
                  log.success === false ? 'bg-red-50' :
                  'bg-gray-50'
                }`}
              >
                {log.success === true && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
                {log.success === false && <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                {log.info && <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className={`${
                    log.success === true ? 'text-green-700' :
                    log.success === false ? 'text-red-700' :
                    'text-gray-700'
                  }`}>
                    {log.message}
                  </span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(log.time).toLocaleTimeString()}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </Card>
      )}
    </div>
  );
}
