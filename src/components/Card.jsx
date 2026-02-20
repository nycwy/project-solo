import { twMerge } from 'tailwind-merge';

const Card = ({ children, className, hover = false, padding = 'md', onClick, ...props }) => {
    const paddings = {
        none: '',
        sm: 'p-3 md:p-4',
        md: 'p-4 md:p-5',
        lg: 'p-5 md:p-6',
        xl: 'p-6 md:p-8',
    };

    return (
        <div
            onClick={onClick}
            className={twMerge(
                'bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border-light)] shadow-[0_1px_3px_var(--color-shadow)]',
                paddings[padding] || paddings.md,
                hover && 'hover:shadow-[0_4px_16px_var(--color-shadow-lg)] hover:border-[var(--color-primary)]/25 transition-all duration-300 cursor-pointer hover:-translate-y-0.5',
                onClick && 'cursor-pointer',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
