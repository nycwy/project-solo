import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { db, auth } from "../services/firebase";
import { doc, updateDoc, onSnapshot, getDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import Button from "../components/Button";
import Input from "../components/Input";
import {
    FiLogOut,
    FiUser,
    FiMail,
    FiCheck,
    FiX,
    FiEdit3,
} from "react-icons/fi";

const Profile = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState(null);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState("");

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

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const newName = username.trim();
            if (!newName) throw new Error("Username cannot be empty");

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: newName });
            }

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { username: newName });

            if (profileData.friendsList && profileData.friendsList.length > 0) {
                const updatePromises = profileData.friendsList.map(async (friend) => {
                    const friendRef = doc(db, "users", friend.uid);
                    const friendSnap = await getDoc(friendRef);

                    if (friendSnap.exists()) {
                        const friendData = friendSnap.data();
                        const theirFriendsList = friendData.friendsList || [];
                        const updatedList = theirFriendsList.map((f) => {
                            if (f.uid === user.uid) return { ...f, username: newName };
                            return f;
                        });
                        await updateDoc(friendRef, { friendsList: updatedList });
                    }
                });
                await Promise.all(updatePromises);
            }

            setMessage("Success");
            setIsEditing(false);
            setTimeout(() => setMessage(""), 3000);
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage("Error");
        }
        setLoading(false);
    };

    const handleLogout = async () => navigate("/logout");

    const getInitials = (name) =>
        name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";

    if (!profileData)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24 font-sans">
            <div className="max-w-lg mx-auto">

                <div className="bg-white rounded-4xl shadow-xl shadow-gray-200/50 overflow-hidden relative">
                    <div className="bg-blue-600 pt-10 pb-16 px-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-white flex items-center justify-center">
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
                                <div className="absolute bottom-1 right-1 bg-green-400 w-5 h-5 rounded-full border-4 border-blue-600"></div>
                            </div>

                            <h2 className="mt-4 text-2xl font-bold text-white tracking-tight">
                                {profileData.username}
                            </h2>
                        </div>
                    </div>

                    <div className="px-6 pb-8 -mt-6 relative z-20">
                        <div className="bg-white rounded-2xl p-1">
                            {message && (
                                <div
                                    className={`mb-6 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold animate-fade-in-down ${message === "Success"
                                            ? "bg-green-50 text-green-600 border border-green-100"
                                            : "bg-red-50 text-red-600 border border-red-100"
                                        }`}
                                >
                                    {message === "Success" ? <FiCheck /> : <FiX />}
                                    {message === "Success" ? "Profile Updated!" : "Update Failed"}
                                </div>
                            )}

                            <form onSubmit={handleUpdateProfile} className="space-y-6 mt-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                            <FiUser size={12} /> Name
                                        </label>
                                        {!isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(true)}
                                                className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <FiEdit3 size={12} /> EDIT
                                            </button>
                                        )}
                                    </div>

                                    <div
                                        className={`transition-all duration-300 ${isEditing ? "scale-100 opacity-100" : "scale-100 opacity-100"}`}
                                    >
                                        {isEditing ? (
                                            <div className="relative">
                                                <Input
                                                    value={username}
                                                    setValue={setUsername}
                                                    placeholder="Enter name"
                                                    className="pl-4 pr-4 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 rounded-xl font-semibold text-gray-800 transition-all shadow-sm focus:shadow-md"
                                                />
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-700 font-bold text-base shadow-sm">
                                                {profileData.username}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="px-1 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <FiMail size={12} /> Email Address
                                    </label>
                                    <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl text-gray-400 font-medium flex justify-between items-center opacity-80">
                                        <span className="truncate pr-4 text-sm font-mono">
                                            {user.email}
                                        </span>
                                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="grid grid-cols-2 gap-3 pt-4 animate-fade-in-up">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setUsername(profileData.username);
                                                setMessage("");
                                            }}
                                            className="w-full py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all shadow-sm"
                                        >
                                            Cancel
                                        </button>
                                        <Button
                                            text={loading ? "Saving..." : "Save Changes"}
                                            disabled={loading}
                                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all"
                                        />
                                    </div>
                                )}
                            </form>

                            <div className="pt-6 border-t border-dashed border-gray-100">
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-4 border border-red-50 text-red-500 bg-red-50/50 rounded-2xl font-bold text-sm hover:bg-red-50 hover:border-red-100 hover:text-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 group shadow-sm"
                                >
                                    <FiLogOut
                                        size={18}
                                        className="transition-transform group-hover:-translate-x-1"
                                    />
                                    Sign Out
                                </button>
                                <div className="mt-4 flex justify-center">
                                    <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-mono text-gray-400">
                                        v1.0.0
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
