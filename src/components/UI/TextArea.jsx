export default function TextArea({ 
  label, 
  error, 
  className = '', 
  rows = 4,
  ...props 
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`w-full px-4 py-2.5 border rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all resize-none bg-white ${
          error ? 'border-red-400 ring-1 ring-red-100' : 'border-stone-300 hover:border-stone-400'
        }`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
