import { Link } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

const Already = ({ text, link, linkText, className }) => {
    return (
        <div className={twMerge('flex items-center justify-center gap-1.5 text-sm', className)}>
            <p className="text-[var(--color-text-muted)]">{text}</p>
            <Link
                className="text-[var(--color-primary)] font-semibold hover:underline transition-colors"
                to={link}
            >
                {linkText}
            </Link>
        </div>
    );
};

export default Already;