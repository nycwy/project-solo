import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { db, auth } from "../services/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import Button from "../components/Button";
import Input from "../components/Input";
import { FiLogOut, FiArrowLeft, FiUser } from "react-icons/fi";

const Profile = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState(null);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState("");

    // 1. Real-time User Data
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfileData(data);
                if (!isEditing) {
                    setUsername(data.username || "");
                }
            }
        });
        return () => unsub();
    }, [user, isEditing]);

    // 2. Profile Update Handler
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            if (!username.trim()) throw new Error("Username cannot be empty");

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: username });
            }

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { username: username });

            setMessage("Profile updated successfully! ✅");
            setIsEditing(false);
            setTimeout(() => setMessage(""), 3000);
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage("Failed to update. ❌");
        }
        setLoading(false);
    };

    const handleLogout = async () => navigate("/logout");

    const getInitials = (name) =>
        name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";

    if (!profileData)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 animate-pulse text-sm">
                    Loading Profile...
                </p>
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24">
            <div className="max-w-md mx-auto">
                {/* Header / Back */}
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <button
                        onClick={() => navigate("/")}
                        className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                        My Profile
                    </h1>
                </div>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden transition-all hover:shadow-2xl">
                    {/* 1. Profile Header (Blue Gradient) */}
                    <div className="bg-linear-to-br from-blue-600 to-blue-700 p-8 flex flex-col items-center text-white relative">
                        {/* Decorative Circle */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-10 translate-x-10 blur-xl"></div>

                        <div className="relative z-10 mb-4 group">
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-blue-200/30 shadow-lg overflow-hidden bg-white flex items-center justify-center">
                                {profileData.photoURL ? (
                                    <img
                                        src={profileData.photoURL}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl md:text-4xl font-bold text-blue-600">
                                        {getInitials(profileData.username)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <h2 className="relative z-10 text-xl md:text-2xl font-bold tracking-tight text-center">
                            {profileData.username}
                        </h2>
                        <p className="relative z-10 text-blue-100 text-xs md:text-sm font-medium opacity-90 mt-1">
                            {user.email}
                        </p>
                    </div>

                    {/* 2. Form Section */}
                    <div className="p-6 md:p-8">
                        {message && (
                            <div
                                className={`mb-6 p-3 rounded-xl text-xs md:text-sm font-bold text-center border ${message.includes("✅")
                                        ? "bg-green-50 text-green-600 border-green-100"
                                        : "bg-red-50 text-red-600 border-red-100"
                                    }`}
                            >
                                {message}
                            </div>
                        )}

                        <form
                            onSubmit={handleUpdateProfile}
                            className="space-y-5 md:space-y-6"
                        >
                            {/* Username Field */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        Display Name
                                    </label>
                                    {!isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(true)}
                                            className="text-[10px] md:text-xs text-blue-600 font-bold hover:text-blue-800 transition uppercase"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="animate-fade-in">
                                        <Input
                                            value={username}
                                            setValue={setUsername}
                                            placeholder="Enter your name"
                                            className="bg-gray-50 focus:bg-white text-sm"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-3 md:p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-700 font-medium text-sm md:text-base flex items-center gap-2">
                                        <FiUser className="text-gray-400" />
                                        {profileData.username}
                                    </div>
                                )}
                            </div>

                            {/* Email Field (Read Only) */}
                            <div>
                                <label className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <div className="p-3 md:p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 font-medium cursor-not-allowed flex justify-between items-center text-sm md:text-base">
                                    <span className="truncate pr-2">{user.email}</span>
                                    <span className="text-[10px] bg-gray-200 px-2 py-1 rounded text-gray-500 whitespace-nowrap">
                                        Locked
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {isEditing && (
                                <div className="flex gap-3 pt-2 animate-fade-in-up">
                                    <Button
                                        text={loading ? "Saving..." : "Save Changes"}
                                        disabled={loading}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setUsername(profileData.username);
                                            setMessage("");
                                        }}
                                        className="px-5 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </form>

                        {/* Footer / Logout */}
                        <div className="mt-8 md:mt-10 pt-6 border-t border-gray-100">
                            <button
                                onClick={handleLogout}
                                className="w-full py-3 md:py-4 border border-red-100 text-red-500 bg-red-50 rounded-xl font-bold text-sm hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center gap-2 group"
                            >
                                <FiLogOut size={18} /> <span>Log Out</span>
                            </button>
                            <p className="mt-4 text-center text-gray-300 text-[10px] font-mono">
                                User ID: {user.uid.slice(0, 8)}...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
