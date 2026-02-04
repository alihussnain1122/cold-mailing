import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  X, 
  Settings, 
  FileText, 
  Users, 
  Send, 
  TestTube, 
  Rocket,
  ChevronRight,
  Mail
} from 'lucide-react';
import { Button, Badge } from '../UI';
import { smtpService, templatesService, contactsService } from '../../services/supabase';

const ONBOARDING_STEPS = [
  {
    id: 'smtp',
    title: 'Configure SMTP',
    description: 'Set up your email server to send emails',
    icon: Settings,
    path: '/settings',
    checkComplete: async () => {
      try {
        const config = await smtpService.get();
        return !!(config?.smtpHost && config?.emailUser && config?.emailPass);
      } catch {
        return false;
      }
    },
  },
  {
    id: 'template',
    title: 'Create Template',
    description: 'Create your first email template',
    icon: FileText,
    path: '/templates',
    checkComplete: async () => {
      try {
        const templates = await templatesService.getAll();
        return templates.length > 0;
      } catch {
        return false;
      }
    },
  },
  {
    id: 'contacts',
    title: 'Import Contacts',
    description: 'Add or import your email recipients',
    icon: Users,
    path: '/contacts',
    checkComplete: async () => {
      try {
        const contacts = await contactsService.getAll();
        return contacts.length > 0;
      } catch {
        return false;
      }
    },
  },
  {
    id: 'test',
    title: 'Send Test Email',
    description: 'Test your configuration with a test email',
    icon: TestTube,
    path: '/send',
    checkComplete: async () => {
      // Check localStorage for test email sent flag
      return localStorage.getItem('sendium_test_email_sent') === 'true';
    },
  },
  {
    id: 'campaign',
    title: 'Launch Campaign',
    description: 'Send your first email campaign',
    icon: Rocket,
    path: '/send',
    checkComplete: async () => {
      // Check localStorage for first campaign flag
      return localStorage.getItem('sendium_first_campaign_sent') === 'true';
    },
  },
];

// Storage keys
const ONBOARDING_DISMISSED_KEY = 'sendium_onboarding_dismissed';
const ONBOARDING_COMPLETED_KEY = 'sendium_onboarding_completed';

export default function OnboardingWizard({ compact = false }) {
  const navigate = useNavigate();
  const [steps, setSteps] = useState(ONBOARDING_STEPS.map(s => ({ ...s, completed: false })));
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);

  async function checkOnboardingStatus() {
    // Check if onboarding was dismissed or completed
    if (localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    if (localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true') {
      setAllCompleted(true);
      setLoading(false);
      return;
    }

    // Check each step's completion status
    const updatedSteps = await Promise.all(
      ONBOARDING_STEPS.map(async (step) => ({
        ...step,
        completed: await step.checkComplete(),
      }))
    );

    setSteps(updatedSteps);
    
    // Check if all steps are completed
    const allDone = updatedSteps.every(s => s.completed);
    if (allDone) {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      setAllCompleted(true);
    }

    setLoading(false);
  }

  // Run once on mount
  useEffect(() => {
    checkOnboardingStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismiss() {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  function handleReset() {
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    localStorage.removeItem('sendium_test_email_sent');
    localStorage.removeItem('sendium_first_campaign_sent');
    setDismissed(false);
    setAllCompleted(false);
    checkOnboardingStatus();
  }

  function getNextStep() {
    return steps.find(s => !s.completed);
  }

  function getCompletedCount() {
    return steps.filter(s => s.completed).length;
  }

  function handleStepClick(step) {
    navigate(step.path);
  }

  if (loading) return null;
  if (dismissed && !compact) return null;
  if (allCompleted && !compact) return null;

  const nextStep = getNextStep();
  const completedCount = getCompletedCount();
  const progressPercent = (completedCount / steps.length) * 100;

  // Compact version for sidebar or header
  if (compact) {
    if (allCompleted) {
      return (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Setup Complete!
          </div>
        </div>
      );
    }

    if (dismissed) {
      return (
        <button
          onClick={handleReset}
          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-100 transition-colors"
        >
          Resume Setup Guide
        </button>
      );
    }

    return (
      <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-700">Getting Started</span>
          <Badge variant="default" size="xs">{completedCount}/{steps.length}</Badge>
        </div>
        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-stone-700 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {nextStep && (
          <button
            onClick={() => handleStepClick(nextStep)}
            className="w-full flex items-center justify-between text-sm text-stone-700 hover:text-stone-900"
          >
            <span className="flex items-center gap-1.5">
              <nextStep.icon className="w-3.5 h-3.5" />
              {nextStep.title}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Full onboarding panel
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 relative">
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-600 hover:bg-white rounded-lg transition-colors"
        aria-label="Dismiss onboarding"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-stone-200 rounded-lg">
          <Mail className="w-6 h-6 text-stone-700" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-900">Welcome to Sendium</h3>
          <p className="text-sm text-stone-500">
            Complete these steps to start sending emails
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-stone-600">Progress</span>
          <span className="font-medium text-stone-700">{completedCount} of {steps.length} completed</span>
        </div>
        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-stone-700 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isNext = nextStep?.id === step.id;
          
          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step)}
              disabled={step.completed}
              className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all text-left ${
                step.completed 
                  ? 'bg-emerald-50 border border-emerald-200' 
                  : isNext
                    ? 'bg-white border-2 border-stone-400'
                    : 'bg-white border border-stone-200 hover:border-stone-300'
              }`}
            >
              {/* Step Number/Check */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                step.completed 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : isNext
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-400'
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="font-semibold text-sm">{index + 1}</span>
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StepIcon className={`w-4 h-4 ${
                    step.completed ? 'text-emerald-600' : 
                    isNext ? 'text-stone-700' : 'text-stone-400'
                  }`} />
                  <span className={`font-medium ${
                    step.completed ? 'text-emerald-700' : 
                    isNext ? 'text-stone-900' : 'text-stone-600'
                  }`}>
                    {step.title}
                  </span>
                  {isNext && (
                    <Badge variant="default" size="sm">Next</Badge>
                  )}
                </div>
                <p className={`text-sm mt-0.5 ${
                  step.completed ? 'text-emerald-600' : 'text-stone-500'
                }`}>
                  {step.completed ? 'Completed ✓' : step.description}
                </p>
              </div>

              {/* Arrow */}
              {!step.completed && (
                <ArrowRight className={`w-5 h-5 shrink-0 ${
                  isNext ? 'text-stone-600' : 'text-stone-300'
                }`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Skip Link */}
      <div className="mt-4 text-center">
        <button
          onClick={handleDismiss}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          Skip setup guide
        </button>
      </div>
    </div>
  );
}
