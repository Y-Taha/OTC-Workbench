type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div>
          <p className="eyebrow">Confirmation</p>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p className="confirm-dialog-message">{message}</p>
        </div>

        <div className="confirm-dialog-actions">
          <button className="button secondary" type="button" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`button ${variant === 'danger' ? 'danger' : 'primary'}`} type="button" disabled={loading} onClick={onConfirm}>
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
