import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { sendAPI } from '../services/api';

const CampaignContext = createContext();

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
  const timerRef = useRef(null);

  const startCampaign = useCallback(async (contacts, config) => {
    console.log('Starting campaign with:', { contacts: contacts.length, config });
    
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
      error: null
    });

    // Start sending emails
    for (let i = 0; i < contacts.length; i++) {
      if (stopRef.current) {
        console.log('Campaign stopped by user');
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

      console.log(`Sending email ${i + 1}/${contacts.length} to ${contact.email}`);

      try {
        const emailData = {
          to: contact.email,
          subject: contact.template.subject,
          html: contact.template.body,
          name: contact.name || '',
          company: contact.company || ''
        };

        await sendAPI.sendSingle(emailData);
        
        console.log(`✓ Email sent to ${contact.email}`);
        setCampaignState(prev => ({
          ...prev,
          sent: prev.sent + 1
        }));

        // Delay between emails with countdown (random delay between min and max)
        if (i < contacts.length - 1 && (config.delayMin > 0 || config.delayMax > 0)) {
          // Calculate random delay in milliseconds
          const randomDelayMs = Math.floor(Math.random() * (config.delayMax - config.delayMin) + config.delayMin);
          const delaySeconds = Math.floor(randomDelayMs / 1000);
          
          console.log(`Waiting ${delaySeconds} seconds (random between ${config.delayMin/1000}s-${config.delayMax/1000}s) before next email...`);
          
          // Countdown timer
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
        console.error(`✗ Failed to send to ${contact.email}:`, error);
        setCampaignState(prev => ({
          ...prev,
          failed: prev.failed + 1,
          error: error.message
        }));
      }
    }

    // Campaign completed
    console.log('Campaign completed');
    setCampaignState(prev => ({
      ...prev,
      isRunning: false,
      status: 'completed',
      currentEmail: ''
    }));
  }, []);

  const stopCampaign = useCallback(() => {
    console.log('Stopping campaign...');
    stopRef.current = true;
  }, []);

  const resetCampaign = useCallback(() => {
    console.log('Resetting campaign...');
    stopRef.current = true;
    campaignDataRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

  const value = {
    ...campaignState,
    startCampaign,
    stopCampaign,
    resetCampaign
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
