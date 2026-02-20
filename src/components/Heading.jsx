import { twMerge } from 'tailwind-merge';

const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
};

const Heading = ({ headingText, text, size = 'md', className }) => {
    return (
        <div className={twMerge('', className)}>
            <h2 className={twMerge('font-extrabold text-center text-[var(--color-text)] tracking-tight', sizes[size] || sizes.md)}>
                {headingText}
            </h2>
            {text && (
                <p className="mt-2 text-center text-sm text-[var(--color-text-muted)] font-medium">{text}</p>
            )}
        </div>
    );
};

export default Heading;