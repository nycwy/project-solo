import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiUsers, FiUser, FiPieChart, FiLayout, FiFileText } from "react-icons/fi";

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: "journal", label: "Journal", icon: FiLayout, path: "/journal" },
        { id: "dashboard", label: "Splitter", icon: FiPieChart, path: "/" },
        { id: "friends", label: "Friends", icon: FiUsers, path: "/friends" },
        { id: "statement", label: "Statement", icon: FiFileText, path: "/statement" },
        // { id: "profile", label: "Profile", icon: FiUser, path: "/profile" },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:hidden">
            <div className="max-w-md mx-auto flex justify-between items-center">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className={`flex flex-col items-center justify-center w-16 py-1 transition-all duration-200 ${isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            <div
                                className={`transition-transform duration-200 ${isActive ? "-translate-y-1" : ""}`}
                            >
                                <tab.icon
                                    size={isActive ? 24 : 22}
                                    className={`transition-all ${isActive ? "stroke-[2.5px]" : "stroke-2"}`}
                                />
                            </div>

                            <span
                                className={`text-[10px] font-bold mt-0.5 transition-all duration-200 ${isActive
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-2 hidden"
                                    }`}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
