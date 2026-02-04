export default function Card({ children, className = '', title, action, subtitle, noPadding = false }) {
  return (
    <div className={`bg-white rounded-xl border border-stone-200 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            {title && <h3 className="text-base font-semibold text-stone-900">{title}</h3>}
            {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
}
