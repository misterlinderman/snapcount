import { ReactNode } from 'react';

export interface EditModalProps {
  open: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  error?: string | null;
  children: ReactNode;
}

/**
 * Focused modal shell for admin edits. Validate with Zod in the parent `onSave` / submit handler
 * and pass parse errors back via `error`.
 */
function EditModal({
  open,
  title,
  titleId,
  onClose,
  onSave,
  saveDisabled = false,
  saveLabel = 'Save',
  error,
  children,
}: EditModalProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      style={{ backgroundColor: 'rgba(15, 20, 25, 0.45)' }}
      role="presentation"
      onClick={() => !saveDisabled && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border p-6 shadow-lg"
        style={{ backgroundColor: 'var(--surface-panel)', borderColor: 'var(--rule)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
          {title}
        </h2>
        <div className="mt-4">{children}</div>
        {error ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--red)', fontFamily: 'var(--font-serif)' }}>
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="min-h-11 rounded border px-4 text-sm"
            style={{ borderColor: 'var(--rule)', fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}
            onClick={onClose}
            disabled={saveDisabled}
          >
            Cancel
          </button>
          <button
            type="button"
            className="min-h-11 rounded border px-4 text-sm font-semibold"
            style={{
              borderColor: 'var(--blue)',
              backgroundColor: 'var(--blue)',
              color: 'var(--white)',
              fontFamily: 'var(--font-playfair-sc)',
            }}
            onClick={onSave}
            disabled={saveDisabled}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
