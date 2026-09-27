import React from 'react';

/**
 * Standardized Action Icon Button for Table Cells
 * Accepts either `variant` or `action` prop:
 * - 'edit' (Pencil)
 * - 'delete' (Trash)
 * - 'view' (Eye)
 * - 'map' (Chain Link)
 * - 'sync' (Cloud Upload / Sync)
 * - 'inward' (Box Inward / Receive)
 * - 'adjust' (Tune Sliders / Calibrate)
 * - 'external' (Arrow Box / External Link)
 */
export default function TableIconButton({
  variant,
  action,
  onClick,
  title = '',
  disabled = false,
  className = '',
  href = null,
  target = '_blank',
  rel = 'noopener noreferrer',
  children,
}) {
  const activeVariant = (variant || action || 'edit').toLowerCase();

  // Variant styles and icons
  let variantStyles = 'border-gray-200 bg-white hover:bg-gray-100 text-gray-600 hover:text-ink';
  let defaultTitle = 'Action';
  let iconContent = null;

  switch (activeVariant) {
    case 'edit':
      defaultTitle = 'Edit record';
      variantStyles = 'border-gray-200 bg-white hover:bg-gray-100 text-gray-600 hover:text-ink';
      iconContent = (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
      break;

    case 'delete':
      defaultTitle = 'Delete record';
      variantStyles = 'border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 hover:text-rose-700';
      iconContent = (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
      break;

    case 'view':
      defaultTitle = 'View details';
      variantStyles = 'border-gray-200 bg-white hover:bg-gray-100 text-gray-600 hover:text-ink';
      iconContent = (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
      break;

    case 'map':
      defaultTitle = 'Map SKU';
      variantStyles = 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 hover:text-accent';
      iconContent = (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
      break;

    case 'sync':
      defaultTitle = 'Push sync inventory';
      variantStyles = 'border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-700 hover:text-sky-800';
      iconContent = (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      );
      break;

    case 'inward':
      defaultTitle = 'Inward Stock';
      variantStyles = 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800';
      iconContent = (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
      break;

    case 'adjust':
      defaultTitle = 'Adjust balance';
      variantStyles = 'border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-700 hover:text-amber-800';
      iconContent = (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      );
      break;

    case 'primary':
    case 'star':
      defaultTitle = 'Set as Primary';
      variantStyles = 'border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-600 hover:text-amber-700';
      iconContent = (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      );
      break;

    case 'external':
      defaultTitle = 'Open link';
      variantStyles = 'border-gray-200 bg-white hover:bg-gray-100 text-gray-500 hover:text-ink';
      iconContent = (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      );
      break;

    default:
      variantStyles = 'border-gray-200 bg-white hover:bg-gray-100 text-gray-600 hover:text-ink';
      break;
  }

  const baseClasses = `w-6 h-6 rounded flex items-center justify-center border shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={baseClasses}
        title={title || defaultTitle}
      >
        {children || iconContent}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      title={title || defaultTitle}
    >
      {children || iconContent}
    </button>
  );
}
