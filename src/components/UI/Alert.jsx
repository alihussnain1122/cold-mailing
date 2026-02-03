import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export default function Alert({ type = 'info', message, className = '' }) {
  const styles = {
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: Info,
    },
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertCircle,
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: XCircle,
    },
  };
  
  const { bg, text, icon: Icon } = styles[type];
  
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${bg} ${className}`}>
      <Icon className={`w-5 h-5 ${text} shrink-0 mt-0.5`} />
      <p className={`text-sm ${text}`}>{message}</p>
    </div>
  );
}
