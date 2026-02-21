import { twMerge } from 'tailwind-merge';

const Spinner = ({ fullPage = false, size = 'md', className }) => {
    const sizes = {
        sm: 'h-5 w-5 border-2',
        md: 'h-8 w-8 border-4',
        lg: 'h-10 w-10 border-4',
    };

    const spinner = (
        <div
            className={twMerge(
                'animate-spin rounded-full border-[var(--color-border)] border-t-[var(--color-primary)]',
                sizes[size] || sizes.md,
                className
            )}
        />
    );

    if (fullPage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default Spinner;
