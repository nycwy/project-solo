import { twMerge } from 'tailwind-merge';
import Button from './Button';

const EmptyState = ({ icon: Icon, title, subtitle, actionText, onAction, className }) => {
    return (
        <div className={twMerge(
            'text-center py-10 md:py-16 px-4 bg-[var(--color-surface)] rounded-xl border border-dashed border-[var(--color-border)]',
            className
        )}>
            {Icon && (
                <div className="p-3 bg-[var(--color-surface-alt)] shadow-sm ring-1 ring-inset ring-[var(--color-border-light)] rounded-xl w-12 h-12 flex items-center justify-center mx-auto mb-3 text-[var(--color-text-muted)]">
                    <Icon className="w-5 h-5" />
                </div>
            )}
            {title && <p className="text-[var(--color-text-secondary)] font-semibold text-sm md:text-base">{title}</p>}
            {subtitle && <p className="text-xs md:text-sm text-[var(--color-text-muted)] mt-1.5 max-w-[200px] md:max-w-xs mx-auto">{subtitle}</p>}
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
