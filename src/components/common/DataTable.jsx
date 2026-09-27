import React from 'react';
import TablePagination from './TablePagination.jsx';

/**
 * Common Standardized DataTable Component for Orderly ERP
 * 
 * Props:
 * - columns: Array of {
 *     key: string,
 *     header: ReactNode | string,
 *     render?: (row, index, safePage, limit) => ReactNode,
 *     width?: string,
 *     minWidth?: string,
 *     align?: 'left' | 'center' | 'right',
 *     className?: string,
 *     headerClassName?: string
 *   }
 * - data: Array of row objects
 * - loading: boolean
 * - minWidth: string (e.g. '950px')
 * - toolbar: ReactNode (e.g. <TableToolbar>...</TableToolbar>)
 * - emptyState: {
 *     icon?: ReactNode,
 *     title?: string,
 *     description?: string,
 *     actionButton?: ReactNode
 *   }
 * - pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages?: number,
 *     onPageChange: (page) => void,
 *     onLimitChange?: (limit) => void,
 *     itemName?: string,
 *     limitOptions?: number[]
 *   }
 * - rowKey: string | ((row) => string | number)
 * - onRowClick?: (row) => void
 * - children: Optional custom thead/tbody if custom layout needed
 * - containerClassName: string
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  minWidth = '950px',
  toolbar = null,
  emptyState = null,
  pagination = null,
  rowKey = 'id',
  onRowClick = null,
  children = null,
  containerClassName = '',
}) {
  const defaultEmptyState = {
    icon: '📂',
    title: 'No records found',
    description: 'There are no items matching your criteria or filters.',
    actionButton: null,
    ...emptyState,
  };

  const getRowKey = (row, index) => {
    if (typeof rowKey === 'function') return rowKey(row);
    return row[rowKey] || index;
  };

  const safePage = pagination?.page || 1;
  const limit = pagination?.limit || 15;

  return (
    <div className={`flex-1 min-h-0 flex flex-col bg-white border border-border rounded-lg overflow-hidden shadow-xs ${containerClassName}`}>
      {/* 1. Optional Top Toolbar Slot */}
      {toolbar}

      {/* 2. Scrollable Table Container */}
      <div className="flex-1 min-h-0 overflow-auto w-full">
        {children ? (
          // Custom Children Mode
          <table className="w-full text-left text-xs text-ink" style={{ minWidth }}>
            {children}
          </table>
        ) : (
          // Declarative Mode
          <table className="w-full text-left text-xs text-ink" style={{ minWidth }}>
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-border shadow-2xs">
              <tr>
                {columns.map((col, idx) => {
                  const alignClass =
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                  return (
                    <th
                      key={col.key || idx}
                      className={`px-3 py-2 bg-gray-50 ${alignClass} ${col.headerClassName || ''}`}
                      style={{
                        width: col.width,
                        minWidth: col.minWidth,
                      }}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs">Loading records…</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                    {defaultEmptyState.icon && (
                      <div className="text-2xl mb-1">{defaultEmptyState.icon}</div>
                    )}
                    <p className="font-semibold text-ink text-xs mb-0.5">{defaultEmptyState.title}</p>
                    {defaultEmptyState.description && (
                      <p className="text-gray-400 text-[11px] mb-3 max-w-sm mx-auto">
                        {defaultEmptyState.description}
                      </p>
                    )}
                    {defaultEmptyState.actionButton}
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr
                    key={getRowKey(row, rowIdx)}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-blue-50/30' : 'hover:bg-blue-50/20'
                    }`}
                  >
                    {columns.map((col, colIdx) => {
                      const alignClass =
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left';

                      return (
                        <td
                          key={col.key || colIdx}
                          className={`px-3 py-1.5 ${alignClass} ${col.className || ''}`}
                        >
                          {col.render
                            ? col.render(row, rowIdx, safePage, limit)
                            : row[col.key] !== undefined && row[col.key] !== null
                            ? String(row[col.key])
                            : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. Optional Bottom Fixed Pagination Bar */}
      {pagination && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          onLimitChange={pagination.onLimitChange}
          itemName={pagination.itemName}
          limitOptions={pagination.limitOptions}
        />
      )}
    </div>
  );
}
