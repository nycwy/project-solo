import { twMerge } from 'tailwind-merge';

const variants = {
    pending: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]/20',
    success: 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20',
    danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[var(--color-danger)]/20',
    info: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/20',
    purple: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/20',
    gray: 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] border-[var(--color-border)]',
    orange: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]/20',
};

const sizes = {
    sm: 'text-[8px] px-1 py-px rounded gap-0.5',
    md: 'text-[9px] px-1.5 py-0.5 rounded gap-0.5',
    lg: 'text-[10px] px-2 py-0.5 rounded-md gap-1',
};

const Badge = ({ children, variant = 'gray', size = 'md', icon: Icon, dot = false, className }) => {
    return (
        <span
            className={twMerge(
                'inline-flex items-center font-bold uppercase tracking-wide border',
                variants[variant],
                sizes[size] || sizes.md,
                className
            )}
        >
            {dot && (
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            )}
            {Icon && <Icon size={size === 'sm' ? 9 : size === 'lg' ? 13 : 10} />}
            {children}
        </span>
    );
};

export default Badge;
