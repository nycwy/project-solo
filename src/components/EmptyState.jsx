import { twMerge } from 'tailwind-merge';
import Button from './Button';

const EmptyState = ({ icon: Icon, title, subtitle, actionText, onAction, className }) => {
    return (
        <div className={twMerge(
            'text-center py-10 md:py-16 px-4 bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)]',
            className
        )}>
            {Icon && (
                <div className="p-3 md:p-4 bg-[var(--color-surface-alt)] rounded-2xl w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 text-[var(--color-text-muted)]">
                    <Icon className="w-6 h-6 md:w-8 md:h-8" />
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
