import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { sendAPI } from '../services/api';

const CampaignContext = createContext();

// Only log in development
const isDev = import.meta.env.DEV;
const log = (...args) => isDev && console.log(...args);

// LocalStorage key for campaign persistence
const CAMPAIGN_STORAGE_KEY = 'mailflow_campaign_state';

// Save campaign state to localStorage
function saveCampaignToStorage(state, data) {
  try {
    const toSave = {
      state: {
        isRunning: state.isRunning,
        progress: state.progress,
        total: state.total,
        sent: state.sent,
        failed: state.failed,
        status: state.status,
        currentTemplate: state.currentTemplate,
      },
      data: data ? {
        contacts: data.contacts,
        config: data.config,
        currentIndex: data.currentIndex,
      } : null,
      savedAt: Date.now(),
    };
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    log('Failed to save campaign state:', e);
  }
}

// Load campaign state from localStorage
function loadCampaignFromStorage() {
  try {
    const stored = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Don't restore if saved more than 24 hours ago
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

// Clear campaign from localStorage
function clearCampaignStorage() {
  localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
}

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within CampaignProvider');
  }
  return context;
};

export const CampaignProvider = ({ children }) => {
  const [campaignState, setCampaignState] = useState({
    isRunning: false,
    currentEmail: '',
    progress: 0,
    total: 0,
    sent: 0,
    failed: 0,
    status: 'idle', // idle, running, paused, completed, error
    error: null,
    nextEmailIn: 0, // seconds until next email
    currentTemplate: null
  });

  const stopRef = useRef(false);
  const campaignDataRef = useRef(null);
  const hasRestoredRef = useRef(false);

  // Restore campaign state on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const saved = loadCampaignFromStorage();
    if (saved && saved.data && saved.state.status === 'running') {
      log('Restoring campaign from storage:', saved);
      
      // Restore state first
      setCampaignState({
        isRunning: false, // Will be set to true when resumed
        currentEmail: '',
        progress: saved.state.progress,
        total: saved.state.total,
        sent: saved.state.sent,
        failed: saved.state.failed,
        status: 'paused', // Show as paused until user resumes
        error: null,
        nextEmailIn: 0,
        currentTemplate: saved.state.currentTemplate,
      });
      
      // Store data for resume
      campaignDataRef.current = saved.data;
    }
  }, []);

  // Save state to localStorage when campaign is running
  useEffect(() => {
    if (campaignState.status === 'running' || campaignState.status === 'paused') {
      saveCampaignToStorage(campaignState, campaignDataRef.current);
    } else if (campaignState.status === 'completed' || campaignState.status === 'idle') {
      clearCampaignStorage();
    }
  }, [campaignState]);

  // Internal function to run campaign from a specific index
  const runCampaignFromIndex = useCallback(async (contacts, config, startIndex, initialSent, initialFailed) => {
    stopRef.current = false;

    for (let i = startIndex; i < contacts.length; i++) {
      if (stopRef.current) {
        log('Campaign stopped by user');
        setCampaignState(prev => ({
          ...prev,
          isRunning: false,
          status: 'paused'
        }));
        return;
      }

      const contact = contacts[i];
      campaignDataRef.current.currentIndex = i;

      setCampaignState(prev => ({
        ...prev,
        currentEmail: contact.email,
        progress: i + 1,
        currentTemplate: contact.template.subject
      }));

      log(`Sending email ${i + 1}/${contacts.length} to ${contact.email}`);

      try {
        const emailData = {
          to: contact.email,
          subject: contact.template.subject,
          html: contact.template.body,
          senderName: config.senderName || 'Support Team'
        };

        await sendAPI.sendSingle(emailData);
        
        log(`✓ Email sent to ${contact.email}`);
        setCampaignState(prev => ({
          ...prev,
          sent: prev.sent + 1
        }));

        // Delay between emails with countdown (random delay between min and max)
        if (i < contacts.length - 1 && (config.delayMin > 0 || config.delayMax > 0)) {
          const randomDelayMs = Math.floor(Math.random() * (config.delayMax - config.delayMin) + config.delayMin);
          const delaySeconds = Math.floor(randomDelayMs / 1000);
          
          log(`Waiting ${delaySeconds} seconds before next email...`);
          
          for (let countdown = delaySeconds; countdown > 0; countdown--) {
            if (stopRef.current) break;
            setCampaignState(prev => ({
              ...prev,
              nextEmailIn: countdown
            }));
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          setCampaignState(prev => ({ ...prev, nextEmailIn: 0 }));
        }

      } catch (error) {
        log(`✗ Failed to send to ${contact.email}:`, error);
        setCampaignState(prev => ({
          ...prev,
          failed: prev.failed + 1,
          error: error.message
        }));
      }
    }

    // Campaign completed
    log('Campaign completed');
    clearCampaignStorage();
    setCampaignState(prev => ({
      ...prev,
      isRunning: false,
      status: 'completed',
      currentEmail: ''
    }));
  }, []);

  const startCampaign = useCallback(async (contacts, config) => {
    log('Starting campaign with:', { contacts: contacts.length, config });
    
    if (!contacts || contacts.length === 0) {
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: 'No contacts to send to'
      }));
      return;
    }

    // Check if contacts have templates
    const hasTemplates = contacts.every(c => c.template);
    if (!hasTemplates) {
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: 'Contacts missing template information'
      }));
      return;
    }

    // Reset state
    stopRef.current = false;
    campaignDataRef.current = { contacts, config, currentIndex: 0 };

    setCampaignState({
      isRunning: true,
      currentEmail: '',
      progress: 0,
      total: contacts.length,
      sent: 0,
      failed: 0,
      status: 'running',
      error: null,
      nextEmailIn: 0,
      currentTemplate: null
    });

    // Start sending emails from the beginning
    await runCampaignFromIndex(contacts, config, 0, 0, 0);
  }, [runCampaignFromIndex]);

  // Resume a paused campaign (from localStorage restore or manual pause)
  const resumeCampaign = useCallback(async () => {
    if (!campaignDataRef.current) {
      log('No campaign data to resume');
      return;
    }

    const { contacts, config, currentIndex } = campaignDataRef.current;
    
    log('Resuming campaign from index:', currentIndex);

    // Get current sent/failed counts from state at resume time
    let currentSent = 0;
    let currentFailed = 0;
    
    setCampaignState(prev => {
      currentSent = prev.sent;
      currentFailed = prev.failed;
      return {
        ...prev,
        isRunning: true,
        status: 'running'
      };
    });

    // Resume from the current index with accurate counts
    await runCampaignFromIndex(contacts, config, currentIndex, currentSent, currentFailed);
  }, [runCampaignFromIndex]);

  const stopCampaign = useCallback(() => {
    log('Stopping campaign...');
    stopRef.current = true;
  }, []);

  const resetCampaign = useCallback(() => {
    log('Resetting campaign...');
    stopRef.current = true;
    campaignDataRef.current = null;
    clearCampaignStorage();
    setCampaignState({
      isRunning: false,
      currentEmail: '',
      progress: 0,
      total: 0,
      sent: 0,
      failed: 0,
      status: 'idle',
      error: null,
      nextEmailIn: 0,
      currentTemplate: null
    });
  }, []);

  // Check if there's a paused campaign that can be resumed
  const canResume = campaignState.status === 'paused' && campaignDataRef.current !== null;

  const value = {
    ...campaignState,
    startCampaign,
    stopCampaign,
    resetCampaign,
    resumeCampaign,
    canResume
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
