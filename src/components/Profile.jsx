import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { db, auth } from "../services/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import Button from "../components/Button";
import Input from "../components/Input";
import { FiLogOut, FiArrowLeft } from "react-icons/fi";

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

    /* // IMAGE UPLOAD LOGIC (Commented out as requested)
        const handleImageChange = async (e) => { ... }
      */

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

    // const getJoinDate = () => {
    //     if (user?.metadata?.creationTime) {
    //         return new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
    //             year: "numeric",
    //             month: "long",
    //             day: "numeric",
    //         });
    //     }
    //     return "Unknown";
    // };

    if (!profileData)
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <p className="text-gray-400 animate-pulse">Loading Profile...</p>
            </div>
        );

    return (
        <div className="flex flex-col items-center p-6">
            {/* Header / Back */}
            <div className="w-full max-w-md flex justify-between items-center mb-6">
                <button
                    onClick={() => navigate("/")}
                    className="text-gray-400 hover:text-gray-600 flex items-center gap-1 font-medium transition"
                >
                    <FiArrowLeft /> Dashboard
                </button>
            </div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
                {/* 1. Header & Avatar */}
                <div className="bg-linear-to-br from-blue-600 to-blue-700 p-8 flex flex-col items-center text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-white"></div>

                    <div className="relative z-10 mb-4 group">
                        <div className="w-28 h-28 rounded-full border-4 border-blue-200/30 shadow-lg overflow-hidden bg-white flex items-center justify-center">
                            {/* We still show photoURL if it exists in DB, otherwise Initials */}
                            {profileData.photoURL ? (
                                <img
                                    src={profileData.photoURL}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl font-bold text-blue-600">
                                    {getInitials(profileData.username)}
                                </span>
                            )}
                        </div>
                        {/* Camera Icon & Input removed here */}
                    </div>

                    <h2 className="relative z-10 text-2xl font-bold tracking-tight">
                        {profileData.username}
                    </h2>
                    <p className="relative z-10 text-blue-100 text-sm font-medium opacity-90">
                        {user.email}
                    </p>
                </div>

                {/* 2. Stats */}
                {/* <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                    <div className="p-4 text-center">
                        <span className="block text-2xl font-bold text-gray-800">
                            {profileData.friendsList?.length || 0}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            Friends
                        </span>
                    </div>
                    <div className="p-4 text-center">
                        <span className="block text-2xl font-bold text-gray-800">
                            {getJoinDate().split(",")[0].split(" ")[1]}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            Joined {getJoinDate().split(",")[0].split(" ")[0]}
                        </span>
                    </div>
                </div> */}

                {/* 3. Form */}
                <div className="p-8">
                    {message && (
                        <div
                            className={`mb-6 p-3 rounded-xl text-sm font-bold text-center border ${message.includes("✅") ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"}`}
                        >
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Display Name
                                </label>
                                {!isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="text-xs text-blue-600 font-bold hover:text-blue-800 transition uppercase"
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
                                        className="bg-gray-50 focus:bg-white"
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-700 font-medium">
                                    {profileData.username}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Email Address
                            </label>
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 font-medium cursor-not-allowed flex justify-between items-center">
                                <span>{user.email}</span>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-500">
                                    Locked
                                </span>
                            </div>
                        </div>

                        {isEditing && (
                            <div className="flex gap-3 pt-2 animate-fade-in-up">
                                <Button
                                    text={loading ? "Saving..." : "Save Changes"}
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setUsername(profileData.username);
                                        setMessage("");
                                    }}
                                    className="px-5 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="mt-10 pt-6 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 border border-red-100 text-red-500 bg-red-50 rounded-xl font-bold text-sm hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center gap-2 group"
                        >
                            <FiLogOut size={20} /> <span>Logout</span>
                        </button>
                        <p className="mt-4 text-center text-gray-300 text-[10px] font-mono">
                            User ID: {user.uid.slice(0, 8)}...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
