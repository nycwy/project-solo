import { twMerge } from 'tailwind-merge';
import Button from './Button';

const EmptyState = ({ icon: Icon, title, subtitle, actionText, onAction, className }) => {
    return (
        <div className={twMerge(
            'text-center py-16 bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)]',
            className
        )}>
            {Icon && (
                <div className="p-4 bg-[var(--color-surface-alt)] rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 text-[var(--color-text-muted)]">
                    <Icon size={24} />
                </div>
            )}
            {title && <p className="text-[var(--color-text-secondary)] font-semibold text-sm">{title}</p>}
            {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-1.5 max-w-xs mx-auto">{subtitle}</p>}
            {actionText && onAction && (
                <Button
                    text={actionText}
                    onClick={onAction}
                    variant="ghost"
                    size="sm"
                    className="mt-5 mx-auto"
                />
            )}
        </div>
    );
};

export default EmptyState;
