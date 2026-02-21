import { FiX } from 'react-icons/fi';
import { twMerge } from 'tailwind-merge';

const Modal = ({ isOpen, onClose, title, icon: Icon, headerClassName, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center">
            <div
                className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
            />

            <div className="bg-[var(--color-surface)] w-full md:max-w-lg rounded-t-xl md:rounded-xl relative z-10 flex flex-col max-h-[85dvh] md:max-h-[80vh] animate-slide-up ring-1 ring-inset ring-[var(--color-border)]">
                {/* Header */}
                {title && (
                    <div className={twMerge(
                        'px-6 py-4 flex justify-between items-center border-b rounded-t-xl',
                        headerClassName || 'bg-[var(--color-surface-alt)] border-[var(--color-border-light)]'
                    )}>
                        <div className="flex items-center gap-2.5">
                            {Icon && (
                                <div className="p-1.5 rounded-lg bg-[var(--color-primary-light)]">
                                    <Icon size={18} className="text-[var(--color-primary)]" />
                                </div>
                            )}
                            <h2 className="font-bold text-[var(--color-text)]">{title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-5 pb-10 md:pb-6 border-t border-[var(--color-border-light)] bg-[var(--color-surface-alt)] md:rounded-b-3xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
