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
      return localStorage.getItem('mailflow_test_email_sent') === 'true';
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
      return localStorage.getItem('mailflow_first_campaign_sent') === 'true';
    },
  },
];

// Storage keys
const ONBOARDING_DISMISSED_KEY = 'mailflow_onboarding_dismissed';
const ONBOARDING_COMPLETED_KEY = 'mailflow_onboarding_completed';

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
    localStorage.removeItem('mailflow_test_email_sent');
    localStorage.removeItem('mailflow_first_campaign_sent');
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
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
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
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Resume Setup Guide
        </button>
      );
    }

    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-blue-800">Getting Started</span>
          <Badge variant="info" size="xs">{completedCount}/{steps.length}</Badge>
        </div>
        <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {nextStep && (
          <button
            onClick={() => handleStepClick(nextStep)}
            className="w-full flex items-center justify-between text-sm text-blue-700 hover:text-blue-800"
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
    <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 relative">
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
        aria-label="Dismiss onboarding"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-100 rounded-xl">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Welcome to MailFlow! 🚀</h3>
          <p className="text-sm text-gray-600">
            Complete these steps to start sending emails
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-blue-600">{completedCount} of {steps.length} completed</span>
        </div>
        <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500"
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
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                step.completed 
                  ? 'bg-green-50 border border-green-200' 
                  : isNext
                    ? 'bg-white border-2 border-blue-400 shadow-md'
                    : 'bg-white border border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Step Number/Check */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                step.completed 
                  ? 'bg-green-100 text-green-600' 
                  : isNext
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StepIcon className={`w-4 h-4 ${
                    step.completed ? 'text-green-600' : 
                    isNext ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    step.completed ? 'text-green-700' : 
                    isNext ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                  {isNext && (
                    <Badge variant="info" size="sm">Next</Badge>
                  )}
                </div>
                <p className={`text-sm mt-0.5 ${
                  step.completed ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.completed ? 'Completed ✓' : step.description}
                </p>
              </div>

              {/* Arrow */}
              {!step.completed && (
                <ArrowRight className={`w-5 h-5 shrink-0 ${
                  isNext ? 'text-blue-600' : 'text-gray-300'
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
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Skip setup guide
        </button>
      </div>
    </div>
  );
}
