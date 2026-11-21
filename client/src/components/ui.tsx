import { useLayoutEffect, useRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export function PageHeader({ title, description, actions }: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-heading">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions}
    </header>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return <span className="badge difficulty-badge" data-tone={difficulty.toLowerCase()}>{difficulty}</span>;
}

export function Feedback({ children, tone, onDismiss }: {
  children: ReactNode;
  tone: 'success' | 'error' | 'warning';
  onDismiss?: () => void;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={onDismiss ? 'feedback toast' : 'feedback'} data-tone={tone}>
      <Icon aria-hidden="true" />
      <span role={tone === 'success' ? 'status' : 'alert'}>{children}</span>
      {onDismiss && (
        <button type="button" className="icon-button" aria-label="Dismiss notification" onClick={onDismiss}>
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function Modal({ children, onClose, ...props }: Omit<ComponentProps<'dialog'>, 'onClose'> & {
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      {...props}
    >
      {children}
    </dialog>
  );
}
