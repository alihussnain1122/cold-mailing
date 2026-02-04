/**
 * Onboarding hooks for marking progress steps as complete
 * Separated from OnboardingWizard component for fast refresh support
 */

// Mark test email step as complete
export function useMarkTestEmailSent() {
  return () => {
    localStorage.setItem('sendium_test_email_sent', 'true');
  };
}

// Mark first campaign step as complete
export function useMarkFirstCampaignSent() {
  return () => {
    localStorage.setItem('sendium_first_campaign_sent', 'true');
  };
}

// Check if onboarding is complete
export function useIsOnboardingComplete() {
  return () => {
    return localStorage.getItem('sendium_onboarding_completed') === 'true';
  };
}

// Reset onboarding progress
export function useResetOnboarding() {
  return () => {
    localStorage.removeItem('sendium_onboarding_dismissed');
    localStorage.removeItem('sendium_onboarding_completed');
    localStorage.removeItem('sendium_test_email_sent');
    localStorage.removeItem('sendium_first_campaign_sent');
  };
}
