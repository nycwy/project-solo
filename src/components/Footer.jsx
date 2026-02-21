const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full py-4 text-center mt-auto">
            <p className="text-[10px] md:text-xs text-[var(--color-text-muted)] font-medium">
                &copy; {currentYear} Splitter. All rights reserved.
            </p>
        </footer>
    );
};

export default Footer;
