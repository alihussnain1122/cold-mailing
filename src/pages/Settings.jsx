import { useEffect, useState } from 'react';
import { Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Button, Input, Alert } from '../components/UI';
import { configAPI } from '../services/api';

export default function Settings() {
  const [config, setConfig] = useState({
    smtpHost: '',
    smtpPort: '587',
    emailUser: '',
    emailPass: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const data = await configAPI.get();
      setConfig({
        smtpHost: data.smtpHost || '',
        smtpPort: data.smtpPort || '587',
        emailUser: data.emailUser || '',
        emailPass: '',
      });
      setConfigured(data.configured);
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    
    if (!config.smtpHost || !config.emailUser || !config.emailPass) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await configAPI.update(config);
      setSuccess('Settings saved successfully');
      setConfigured(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 mt-1">Configure your SMTP email settings</p>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <Card title="SMTP Configuration" className="max-w-2xl">
        <div className="mb-6">
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            configured ? 'bg-green-50' : 'bg-yellow-50'
          }`}>
            {configured ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">SMTP is configured</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-700 font-medium">SMTP not configured yet</span>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="SMTP Host"
            placeholder="e.g., smtp.gmail.com"
            value={config.smtpHost}
            onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
          />

          <Input
            label="SMTP Port"
            placeholder="587"
            value={config.smtpPort}
            onChange={(e) => setConfig({ ...config, smtpPort: e.target.value })}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="your-email@gmail.com"
            value={config.emailUser}
            onChange={(e) => setConfig({ ...config, emailUser: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              App Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter app password"
                value={config.emailPass}
                onChange={(e) => setConfig({ ...config, emailPass: e.target.value })}
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              For Gmail, use an App Password instead of your regular password
            </p>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Help Section */}
      <Card title="Setup Instructions" className="max-w-2xl">
        <div className="prose prose-sm text-gray-600">
          <h4 className="text-gray-900 font-medium">For Gmail:</h4>
          <ol className="space-y-2 mt-2">
            <li>Go to your Google Account settings</li>
            <li>Navigate to Security → 2-Step Verification (enable if not already)</li>
            <li>Go to Security → App passwords</li>
            <li>Generate a new app password for "Mail"</li>
            <li>Use <strong>smtp.gmail.com</strong> as SMTP host</li>
            <li>Use port <strong>587</strong></li>
          </ol>

          <h4 className="text-gray-900 font-medium mt-6">For Other Providers:</h4>
          <ul className="space-y-1 mt-2">
            <li><strong>Outlook:</strong> smtp.office365.com, port 587</li>
            <li><strong>Yahoo:</strong> smtp.mail.yahoo.com, port 587</li>
            <li><strong>Zoho:</strong> smtp.zoho.com, port 587</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
