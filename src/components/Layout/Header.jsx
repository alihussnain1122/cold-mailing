import { Mail, Activity } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';

export default function Header() {
  const campaign = useCampaign();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Cold Email Sender</h1>
              <p className="text-xs text-gray-500">Manage and send bulk emails</p>
            </div>
          </div>

          {/* Campaign Status Indicator */}
          {campaign.isRunning && (
            <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <div className="animate-pulse">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <Activity className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Campaign Running
                </span>
              </div>
              <div className="text-sm text-green-600">
                {campaign.sent} / {campaign.total}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
