import { twMerge } from 'tailwind-merge';

const Input = ({
    type = 'text',
    value,
    placeholder,
    setValue,
    onChange,
    className,
    label,
    error,
    icon: Icon,
    prefix,
    name,
    autoFocus,
    disabled,
    min,
    max,
    ...props
}) => {
    const handleChange = (e) => {
        if (setValue) setValue(e.target.value);
        if (onChange) onChange(e);
    };

    return (
        <div className="w-full">
            {label && (
                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
                )}
                {prefix && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-semibold text-sm">
                        {prefix}
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    name={name}
                    placeholder={placeholder}
                    onChange={handleChange}
                    autoFocus={autoFocus}
                    disabled={disabled}
                    min={min}
                    max={max}
                    className={twMerge(
                        'w-full px-3.5 py-3 bg-[var(--color-surface)] shadow-sm ring-1 ring-inset ring-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-text)]',
                        'outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] transition-all duration-200',
                        'placeholder:text-[var(--color-text-muted)]',
                        disabled && 'opacity-50 cursor-not-allowed',
                        Icon && 'pl-10',
                        prefix && 'pl-12',
                        error && 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger-light)]',
                        className
                    )}
                    onWheel={(e) => type === 'number' && e.target.blur()}
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1 ml-1 text-xs text-[var(--color-danger)] font-medium">{error}</p>
            )}
        </div>
    );
};

export default Input;