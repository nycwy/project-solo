import { twMerge } from 'tailwind-merge';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const PageHeader = ({ title, subtitle, icon: Icon, iconClassName, onBack, rightContent, className }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack === true) navigate(-1);
        else if (typeof onBack === 'function') onBack();
    };

    return (
        <div className={twMerge('flex items-center justify-between mb-6 md:mb-8', className)}>
            <div className="flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={handleBack}
                        className="p-2 -ml-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-xl transition-all"
                    >
                        <FiArrowLeft size={22} />
                    </button>
                )}
                {Icon && (
                    <div className={twMerge(
                        'p-2.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-xl',
                        iconClassName
                    )}>
                        <Icon size={20} className="md:w-6 md:h-6" />
                    </div>
                )}
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold text-[var(--color-text)] tracking-tight">{title}</h1>
                    {subtitle && <p className="text-xs text-[var(--color-text-muted)] font-medium">{subtitle}</p>}
                </div>
            </div>
            {rightContent && <div>{rightContent}</div>}
        </div>
    );
};

export default PageHeader;
