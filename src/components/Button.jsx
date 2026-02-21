import { twMerge } from 'tailwind-merge';

const variantStyles = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm ring-1 ring-inset ring-[var(--color-primary)]/20',
    secondary: 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]',
    danger: 'bg-[var(--color-danger)] text-white hover:opacity-90 shadow-sm ring-1 ring-inset ring-[var(--color-danger)]/20',
    ghost: 'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
    outline: 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]',
    success: 'bg-[var(--color-success)] text-white hover:opacity-90 shadow-sm ring-1 ring-inset ring-[var(--color-success)]/20',
};

const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-xs rounded-md',
    sm: 'px-3.5 py-2 text-sm rounded-lg',
    md: 'px-5 py-2.5 rounded-lg',
    lg: 'px-6 py-3.5 text-base rounded-lg',
};

const Button = ({
    text,
    children,
    onClick,
    className,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled = false,
    loading = false,
    type = 'button',
    ...props
}) => {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={twMerge(
                'font-semibold transition-all duration-200 active:scale-[0.97] inline-flex items-center justify-center gap-2',
                variantStyles[variant] || variantStyles.primary,
                sizeStyles[size] || sizeStyles.md,
                fullWidth && 'w-full',
                isDisabled && 'opacity-50 cursor-not-allowed active:scale-100 saturate-50',
                className
            )}
            {...props}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <>
                    {Icon && iconPosition === 'left' && <Icon size={16} />}
                    {text || children}
                    {Icon && iconPosition === 'right' && <Icon size={16} />}
                </>
            )}
        </button>
    );
};

export default Button;