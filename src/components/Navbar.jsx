import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { NotificationContext } from "../context/NotificationContext";
import { FiUser, FiPieChart, FiLayout, FiFileText } from "react-icons/fi";
import { FaUserFriends } from "react-icons/fa";

const Navbar = () => {
    const { user } = useContext(AuthContext);
    const { friendRequestsCount, splitRequestsCount } = useContext(NotificationContext);
    const navigate = useNavigate();

    const userName = user?.username || user?.displayName?.split(" ")[0] || "User";

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning,";
        if (hour < 17) return "Good Afternoon,";
        if (hour < 21) return "Good Evening,";
        return "Good Night,";
    };

    const desktopLinkClasses = ({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm relative
        ${isActive
            ? "text-blue-600 bg-blue-50 font-bold"
            : "text-gray-500 hover:text-blue-600 hover:bg-gray-50"
        }`;

    return (
        <nav className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
                <div className="flex flex-row-reverse md:flex-row justify-between items-center h-full">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            K
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden sm:block">
                            Kati?
                        </h1>
                    </div>

                    <div className="hidden md:flex items-center space-x-1">
                        <NavLink to="/journal" className={desktopLinkClasses}>
                            <FiLayout size={18} /> <span>Journal</span>
                        </NavLink>
                        <NavLink to="/split" className={desktopLinkClasses}>
                            <div className="relative">
                                <FiPieChart size={18} />
                                {splitRequestsCount > 0 && (
                                    <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 border border-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:border-gray-900">
                                        <span className="text-xs font-bold text-white leading-none transform scale-90 pt-[1px]">
                                            {splitRequestsCount}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <span>Fair Share</span>
                        </NavLink>
                        <NavLink to="/friends" className={desktopLinkClasses}>
                            <div className="relative">
                                <FaUserFriends size={18} />
                                {friendRequestsCount > 0 && (
                                    <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 border border-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:border-gray-900">
                                        <span className="text-xs font-bold text-white leading-none transform scale-90 pt-[1px]">
                                            {friendRequestsCount}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <span>Friends</span>
                        </NavLink>
                        <NavLink to="/statement" className={desktopLinkClasses}>
                            <FiFileText size={18} /> <span>Statement</span>
                        </NavLink>

                        <div className="w-px h-6 bg-gray-200 mx-2"></div>

                        <NavLink to="/profile" className={desktopLinkClasses}>
                            <FiUser size={18} /> <span>Profile</span>
                        </NavLink>
                    </div>

                    <div className="md:hidden flex items-center h-full">
                        <div
                            onClick={() => navigate("/profile")}
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <div className="w-9 h-9 bg-linear-to-tr from-blue-600 to-blue-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md shadow-blue-100 border-2 border-white shrink-0">
                                {userName[0].toUpperCase()}
                            </div>

                            <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-gray-400 font-bold tracking-wider leading-none">
                                    {getGreeting()}
                                </span>
                                <span className="text-sm font-bold text-gray-800 capitalize leading-tight mt-0.5">
                                    {userName}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav >
    );
};

export default Navbar;
