import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FiUser, FiMenu, FiX, FiPieChart, FiLayout } from "react-icons/fi";
import { FaUserFriends } from "react-icons/fa";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    // Desktop: Subtle hover effects, bold text when active
    const desktopLinkClasses = ({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm
        ${isActive
            ? "text-blue-600 bg-blue-50 font-bold"
            : "text-gray-500 hover:text-blue-600 hover:bg-gray-50"
        }`;

    // Mobile: Larger tap targets, full width
    const mobileMenuClasses = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm
        ${isActive
            ? "text-blue-600 bg-blue-50 font-bold"
            : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
        }`;

    return (
        <>
            <nav className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
                    <div className="flex justify-between items-center h-full">
                        {/* BRANDING */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                K
                            </div>
                            <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden sm:block">
                                King!
                            </h1>
                        </div>

                        {/* DESKTOP MENU */}
                        <div className="hidden md:flex items-center space-x-1">
                            <NavLink to="/journal" className={desktopLinkClasses}>
                                <FiLayout size={18} /> <span>Journal</span>
                            </NavLink>
                            <NavLink to="/" className={desktopLinkClasses}>
                                <FiPieChart size={18} /> <span>Splitter</span>
                            </NavLink>
                            <NavLink to="/friends" className={desktopLinkClasses}>
                                <FaUserFriends size={18} /> <span>Friends</span>
                            </NavLink>

                            {/* Divider */}
                            <div className="w-px h-6 bg-gray-200 mx-2"></div>

                            <NavLink to="/profile" className={desktopLinkClasses}>
                                <FiUser size={18} /> <span>Profile</span>
                            </NavLink>
                        </div>

                        {/* MOBILE HAMBURGER */}
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={toggleMenu}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition focus:outline-none"
                                aria-label="Toggle menu"
                            >
                                {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* MOBILE DROPDOWN MENU */}
                {isOpen && (
                    <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-xl z-40">
                        <div className="p-4 space-y-2">
                            <NavLink to="/" onClick={closeMenu} className={mobileMenuClasses}>
                                <FiPieChart size={20} /> Splitter
                            </NavLink>
                            <NavLink
                                to="/journal"
                                onClick={closeMenu}
                                className={mobileMenuClasses}
                            >
                                <FiLayout size={20} /> Journal
                            </NavLink>
                            <NavLink
                                to="/friends"
                                onClick={closeMenu}
                                className={mobileMenuClasses}
                            >
                                <FaUserFriends size={20} /> Friends
                            </NavLink>

                            <div className="border-t border-gray-100 my-2"></div>

                            <NavLink
                                to="/profile"
                                onClick={closeMenu}
                                className={mobileMenuClasses}
                            >
                                <FiUser size={20} /> Profile
                            </NavLink>
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
};

export default Navbar;
