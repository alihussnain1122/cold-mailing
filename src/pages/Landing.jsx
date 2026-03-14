import { useNavigate } from 'react-router-dom';
import { Send, Users, Server, Shield, Clock, ArrowRight, Sparkles } from 'lucide-react';

const features = [
  { icon: Send,     title: 'Campaign Management', desc: 'Launch, pause, and resume campaigns' },
  { icon: Sparkles, title: 'AI Templates',         desc: 'Generate & refine emails with AI' },
  { icon: Users,    title: 'Contact Management',   desc: 'CSV import with custom fields' },
  { icon: Server,   title: 'Any SMTP Provider',    desc: 'Gmail, Outlook, Zoho, and more' },
  { icon: Shield,   title: 'Deliverability Check', desc: 'Verify SPF, DKIM & DMARC records' },
  { icon: Clock,    title: 'Smart Send Delays',    desc: 'Randomized delays to avoid spam' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-stone-50">
      {/* Nav */}
      <nav className="h-12 bg-white border-b border-stone-200 flex items-center shrink-0">
        <div className="w-full max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/sendium-logo.png" alt="Sendium" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-stone-900">Sendium</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 text-sm font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Logo — standalone, larger */}
        <img
          src="/sendium-logo.png"
          alt="Sendium"
          className="w-30 h-30 rounded-3xl shadow-lg"
        />

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">
            Cold Email, Done Right
          </h1>
          <p className="text-sm text-stone-500 max-w-xs mx-auto mb-5">
            A self-hosted campaign manager for personalized cold emails — no limits.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 max-w-2xl w-full">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-stone-200 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-7 h-7 bg-stone-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-stone-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-900 leading-tight">{title}</p>
                <p className="text-xs text-stone-400 mt-0.5 leading-tight">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-9 border-t border-stone-200 bg-white flex items-center justify-center shrink-0">
        <span className="text-xs text-stone-400">Sendium v1.0 &mdash; Cold Email Campaign Manager</span>
      </footer>
    </div>
  );
}
