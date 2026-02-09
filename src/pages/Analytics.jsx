import { useState, useEffect, useMemo } from 'react';
import { Eye, MousePointer, XCircle, RefreshCw, Mail, TrendingUp, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react';
import { Card, Badge, Button, PageLoader } from '../components/UI';
import { trackingService, campaignService } from '../services/supabase';

const ITEMS_PER_PAGE = 10;

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('all'); // 'all', 'open', 'click'

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignData(selectedCampaign);
    }
  }, [selectedCampaign]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const campaignsData = await campaignService.getAll();
      setCampaigns(campaignsData);
      if (campaignsData.length > 0) {
        setSelectedCampaign(campaignsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignData = async (campaignId) => {
    try {
      const [stats, events] = await Promise.all([
        trackingService.getCampaignStats(campaignId),
        trackingService.getCampaignEvents(campaignId),
      ]);
      setCampaignStats(stats);
      setTrackingEvents(events);
    } catch (err) {
      console.error('Error loading campaign data:', err);
    }
  };

  const currentCampaign = campaigns.find(c => c.id === selectedCampaign);

  // Filter and paginate events
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return trackingEvents;
    return trackingEvents.filter(e => e.tracking_type === filterType);
  }, [trackingEvents, filterType]);

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedCampaign]);

  if (loading) {
    return <PageLoader />;
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-stone-900">Analytics</h1>
            <p className="text-stone-500 mt-1 text-sm sm:text-base">Track email opens, clicks, and engagement</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadInitialData}>
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 pt-5 border-t border-stone-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-stone-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {campaigns.length > 0 ? (
            <>
              {/* Campaign Selector */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-start sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700">
                      View Analytics For
                    </label>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                  {selectedCampaign && campaigns.length > 1 && (
                    <button
                      onClick={() => setSelectedCampaign(campaigns[0]?.id || null)}
                      className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 whitespace-nowrap"
                    >
                      <X className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                </div>
                
                {/* Native select for all screen sizes - works well on mobile */}
                <div className="relative">
                  <select
                    value={selectedCampaign || ''}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="w-full px-3 py-3 pr-10 border border-stone-300 rounded-lg bg-white text-stone-900 text-sm focus:ring-2 focus:ring-stone-500 focus:border-stone-500 appearance-none"
                  >
                    {campaigns.map((campaign) => {
                      const date = new Date(campaign.created_at);
                      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const status = campaign.sent_count === campaign.total_contacts ? '✓' : '•';
                      const name = campaign.name || 'Unnamed Campaign';
                      return (
                        <option key={campaign.id} value={campaign.id}>
                          {name} - {formattedDate} {status} {campaign.sent_count}/{campaign.total_contacts || campaign.total_emails} sent
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>

                {/* Selected campaign preview */}
                {currentCampaign && (
                  <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-stone-900">
                        {currentCampaign.name || 'Unnamed Campaign'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        currentCampaign.sent_count === (currentCampaign.total_contacts || currentCampaign.total_emails)
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {currentCampaign.sent_count === (currentCampaign.total_contacts || currentCampaign.total_emails) ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1">
                      {currentCampaign.sent_count} of {currentCampaign.total_contacts || currentCampaign.total_emails} emails sent • {new Date(currentCampaign.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  icon={Mail}
                  label="Total Sent"
                  value={currentCampaign?.sent_count || 0}
                  sublabel={currentCampaign?.total_contacts > 0 
                    ? `of ${currentCampaign.total_contacts} contacts`
                    : null}
                  color="stone"
                />
                <StatCard
                  icon={Eye}
                  label="Opens"
                  value={campaignStats?.opens || 0}
                  sublabel={currentCampaign?.sent_count > 0 
                    ? `${((campaignStats?.opens || 0) / currentCampaign.sent_count * 100).toFixed(1)}% rate`
                    : null}
                  color="emerald"
                />
                <StatCard
                  icon={MousePointer}
                  label="Clicks"
                  value={campaignStats?.clicks || 0}
                  sublabel={campaignStats?.opens > 0 
                    ? `${((campaignStats?.clicks || 0) / campaignStats.opens * 100).toFixed(1)}% CTR`
                    : null}
                  color="amber"
                />

              </div>

              {/* Recent Activity */}
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                {/* Header with filters */}
                <div className="p-4 sm:p-5 border-b border-stone-100">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-stone-900">Recent Activity</h3>
                        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                          {filteredEvents.length} {filterType === 'all' ? 'total' : filterType} event{filteredEvents.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                          filterType === 'all'
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setFilterType('open')}
                        className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1 sm:gap-1.5 ${
                          filterType === 'open'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Opens
                      </button>
                      <button
                        onClick={() => setFilterType('click')}
                        className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1 sm:gap-1.5 ${
                          filterType === 'click'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        <MousePointer className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Clicks
                      </button>
                    </div>
                  </div>
                </div>

                {/* Events List */}
                {filteredEvents.length > 0 ? (
                  <>
                    <div className="divide-y divide-stone-100">
                      {paginatedEvents.map((event, index) => (
                        <div 
                          key={event.id} 
                          className="px-5 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors"
                        >
                          <div className="flex items-center justify-center w-8 text-sm font-medium text-stone-400">
                            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            event.tracking_type === 'open' 
                              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200' 
                              : event.tracking_type === 'click' 
                                ? 'bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200' 
                                : 'bg-stone-100 border border-stone-200'
                          }`}>
                            {event.tracking_type === 'open' && <Eye className="w-5 h-5 text-emerald-600" />}
                            {event.tracking_type === 'click' && <MousePointer className="w-5 h-5 text-amber-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-stone-900 truncate">{event.email}</span>
                              <Badge 
                                variant={event.tracking_type === 'open' ? 'success' : 'warning'}
                                className="flex-shrink-0"
                              >
                                {event.tracking_type === 'open' ? 'Opened' : 'Clicked'}
                              </Badge>
                            </div>
                            {event.link_url && (
                              <div className="text-xs text-stone-500 mt-1 truncate">
                                {(() => {
                                  try {
                                    const url = new URL(event.link_url);
                                    return (
                                      <span className="flex items-center gap-1">
                                        <MousePointer className="w-3 h-3" />
                                        {url.hostname}{url.pathname !== '/' ? url.pathname : ''}
                                      </span>
                                    );
                                  } catch {
                                    return event.link_url;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm text-stone-600">
                              {new Date(event.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div className="text-xs text-stone-400">
                              {new Date(event.created_at).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="px-5 py-4 border-t border-stone-100 bg-stone-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-sm text-stone-600">
                            Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                            <span className="font-medium">
                              {Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)}
                            </span>{' '}
                            of <span className="font-medium">{filteredEvents.length}</span> results
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              className="p-2 rounded-lg text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                              title="First page"
                            >
                              <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="p-2 rounded-lg text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                              title="Previous page"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            {/* Page numbers */}
                            <div className="flex items-center gap-1 px-2">
                              {(() => {
                                const pages = [];
                                const maxVisiblePages = 5;
                                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                
                                if (endPage - startPage + 1 < maxVisiblePages) {
                                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                }
                                
                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(
                                    <button
                                      key={i}
                                      onClick={() => setCurrentPage(i)}
                                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                        currentPage === i
                                          ? 'bg-stone-900 text-white'
                                          : 'text-stone-600 hover:bg-stone-200'
                                      }`}
                                    >
                                      {i}
                                    </button>
                                  );
                                }
                                return pages;
                              })()}
                            </div>
                            
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className="p-2 rounded-lg text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                              title="Next page"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                              className="p-2 rounded-lg text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                              title="Last page"
                            >
                              <ChevronsRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8">
                    <EmptyState
                      icon={TrendingUp}
                      title={filterType === 'all' ? 'No activity yet' : `No ${filterType}s yet`}
                      description={filterType === 'all' 
                        ? 'Send a campaign to start tracking engagement'
                        : `No ${filterType} events recorded for this campaign`
                      }
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl p-8">
              <EmptyState
                icon={Mail}
                title="No campaigns yet"
                description="Send your first campaign to see analytics"
              />
            </div>
          )}
        </div>
      )}


    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, color }) {
  const colors = {
    stone: 'bg-stone-50 text-stone-600 border-stone-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-5">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border ${colors[color]}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-semibold text-stone-900">{value}</div>
      <div className="text-xs sm:text-sm text-stone-500">{label}</div>
      {sublabel && <div className="text-xs text-stone-400 mt-1 hidden sm:block">{sublabel}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="w-12 h-12 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Icon className="w-6 h-6 text-stone-500" />
      </div>
      <h3 className="text-sm font-medium text-stone-900">{title}</h3>
      <p className="text-sm text-stone-500 mt-1">{description}</p>
    </div>
  );
}
