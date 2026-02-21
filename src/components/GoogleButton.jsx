import { FcGoogle } from 'react-icons/fc';

const GoogleButton = ({ text, onClick, loading }) => {
    return (
        <div className="w-full mt-4">
            <div className="relative flex items-center mb-4">
                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                <span className="flex-shrink-0 mx-4 text-sm text-[var(--color-text-muted)]">or</span>
                <div className="flex-grow border-t border-[var(--color-border)]"></div>
            </div>

            <button
                type="button"
                onClick={onClick}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 md:py-2.5 px-4 rounded-xl md:rounded-lg text-base md:text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                ) : (
                    <FcGoogle size={20} className="flex-shrink-0" />
                )}
                <span className="truncate">{text}</span>
            </button>
        </div>
    );
};

export default GoogleButton;
