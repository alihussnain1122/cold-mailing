import { useEffect, useState } from 'react';
import { Mail, Users, FileText, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, Badge } from '../components/UI';
import { templatesAPI, contactsAPI, sendAPI } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    templates: 0,
    contacts: 0,
    sent: 0,
    failed: 0,
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [templates, contacts, statusData] = await Promise.all([
        templatesAPI.getAll(),
        contactsAPI.getAll(),
        sendAPI.getStatus(),
      ]);
      
      setStats({
        templates: templates.length,
        contacts: contacts.length,
        sent: statusData.progress?.sent || 0,
        failed: statusData.progress?.failed?.length || 0,
      });
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStatus() {
    try {
      const statusData = await sendAPI.getStatus();
      setStatus(statusData);
      if (statusData.progress) {
        setStats(prev => ({
          ...prev,
          sent: statusData.progress.sent || 0,
          failed: statusData.progress.failed?.length || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  }

  const statCards = [
    { label: 'Email Templates', value: stats.templates, icon: FileText, color: 'blue' },
    { label: 'Total Contacts', value: stats.contacts, icon: Users, color: 'green' },
    { label: 'Emails Sent', value: stats.sent, icon: Send, color: 'purple' },
    { label: 'Failed', value: stats.failed, icon: XCircle, color: 'red' },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

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
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your email campaigns</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Current Status */}
      <Card title="Campaign Status">
        {status?.isSending ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="font-medium text-green-700">Sending in progress...</span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">
                  {status.progress.sent} / {status.progress.total}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(status.progress.sent / status.progress.total) * 100}%` }}
                ></div>
              </div>
              
              {status.progress.current && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>Currently sending to: {status.progress.current}</span>
                </div>
              )}
              
              {status.progress.delaySeconds > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Waiting {status.progress.delaySeconds}s before next email</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            <span>No active campaign</span>
          </div>
        )}
      </Card>

      {/* Recent Logs */}
      {status?.progress?.logs?.length > 0 && (
        <Card title="Recent Activity">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {status.progress.logs.slice(-10).reverse().map((log, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                {log.success === true && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                {log.success === false && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                {log.info && <Clock className="w-4 h-4 text-blue-500 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{log.message}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
