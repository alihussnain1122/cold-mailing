import { ArrowRight } from 'lucide-react';
import Button from './Button';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel,
  secondaryAction,
  secondaryLabel,
  compact = false
}) {
  if (compact) {
    return (
      <div className="text-center py-8">
        {Icon && (
          <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Icon className="w-6 h-6 text-stone-400" />
          </div>
        )}
        <h3 className="text-sm font-medium text-stone-900">{title}</h3>
        {description && <p className="text-sm text-stone-500 mt-1">{description}</p>}
        {action && actionLabel && (
          <Button variant="outline" size="sm" onClick={action} className="mt-4">
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-12 px-4">
      {Icon && (
        <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Icon className="w-8 h-8 text-stone-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
      {description && (
        <p className="text-stone-500 max-w-sm mx-auto mb-6">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && actionLabel && (
            <Button onClick={action}>
              {actionLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {secondaryAction && secondaryLabel && (
            <Button variant="outline" onClick={secondaryAction}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
