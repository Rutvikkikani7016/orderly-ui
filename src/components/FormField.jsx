export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  optional = false,
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-gray-600 mb-1.5">
        {label}
        {optional && <span className="text-gray-400"> (optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={error ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
