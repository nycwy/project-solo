import { twMerge } from 'tailwind-merge';

const sizes = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-28 h-28 text-4xl',
};

const Avatar = ({ name, photoURL, size = 'md', online, className, ...props }) => {
    const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';

    return (
        <div className={twMerge('relative inline-flex shrink-0', className)} {...props}>
            <div className={twMerge(
                'rounded-full flex items-center justify-center font-bold overflow-hidden',
                'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
                sizes[size] || sizes.md
            )}>
                {photoURL ? (
                    <img src={photoURL} alt={name || 'avatar'} className="w-full h-full object-cover" />
                ) : (
                    <span>{initial}</span>
                )}
            </div>
            {online !== undefined && (
                <div className={twMerge(
                    'absolute bottom-0 right-0 rounded-full border-2 border-[var(--color-surface)]',
                    online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-muted)]',
                    size === 'xs' || size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
                )} />
            )}
        </div>
    );
};

export default Avatar;
