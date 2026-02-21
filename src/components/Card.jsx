import { twMerge } from 'tailwind-merge';

const Card = ({ children, className, hover = false, padding = 'md', onClick, ...props }) => {
    const paddings = {
        none: '',
        sm: 'py-2.5 px-3',
        md: 'p-4',
        lg: 'py-4 px-5 md:py-5 md:px-6',
        xl: 'py-5 px-6 md:py-6 md:px-8',
    };

    return (
        <div
            onClick={onClick}
            className={twMerge(
                'bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-light)]/50',
                paddings[padding] || paddings.md,
                hover && 'hover:bg-[var(--color-surface-hover)] transition-colors duration-200 cursor-pointer',
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
