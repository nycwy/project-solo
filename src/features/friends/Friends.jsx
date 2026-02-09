import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    arrayUnion,
    onSnapshot,
} from "firebase/firestore";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { FiUserPlus, FiSearch, FiChevronRight } from "react-icons/fi";

const Friends = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [friendsList, setFriendsList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Add Friend State
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // 1. Real-time Listen for Friends List
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setFriendsList(docSnap.data().friendsList || []);
            }
        });
        return () => unsub();
    }, [user]);

    // 2. Logic to Add a New Friend
    const handleAddFriend = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            if (email === user.email) throw new Error("You cannot add yourself.");

            // Find user by email
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("User not found. Ask them to sign up!");
            }

            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();
            const friendId = friendDoc.id;

            // Check if already friends
            const alreadyFriends = friendsList.some((f) => f.uid === friendId);
            if (alreadyFriends) throw new Error("You are already friends!");

            // Add to YOUR friends list
            await updateDoc(doc(db, "users", user.uid), {
                friendsList: arrayUnion({
                    uid: friendId,
                    email: friendData.email,
                    username: friendData.username || "Friend",
                }),
            });

            // Add YOU to THEIR friends list
            await updateDoc(doc(db, "users", friendId), {
                friendsList: arrayUnion({
                    uid: user.uid,
                    email: user.email,
                    username: user.displayName || "Friend",
                }),
            });

            setMessage(`Success! Added ${friendData.username}.`);
            setEmail("");
        } catch (error) {
            setMessage(error.message);
        }
        setLoading(false);
    };

    // Filter friends based on search
    const filteredFriends = friendsList.filter(
        (f) =>
            f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">My Friends</h1>
                <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
                    {friendsList.length}
                </span>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
                {/* 1. ADD FRIEND SECTION */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
                    <h2 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <FiUserPlus /> Add New Contact
                    </h2>
                    <form onSubmit={handleAddFriend} className="flex gap-2">
                        <Input
                            type="email"
                            placeholder="friend@email.com"
                            value={email}
                            setValue={setEmail}
                            className="text-sm"
                        />
                        <Button
                            text={loading ? "..." : "Add"}
                            disabled={loading || !email}
                            className="w-auto px-6 py-2"
                        />
                    </form>
                    {message && (
                        <p
                            className={`text-xs mt-2 font-medium ${message.includes("Success") ? "text-green-600" : "text-red-500"}`}
                        >
                            {message}
                        </p>
                    )}
                </div>

                {/* 2. SEARCH BAR */}
                <div className="relative">
                    <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition text-sm"
                    />
                </div>

                {/* 3. FRIENDS LIST */}
                <div className="space-y-2">
                    {filteredFriends.length > 0 ? (
                        filteredFriends.map((friend) => (
                            <div
                                key={friend.uid}
                                onClick={() => navigate(`/friend/${friend.uid}`)}
                                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 hover:shadow-md transition group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition">
                                        {friend.username[0].toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <h3 className="font-bold text-gray-800">
                                            {friend.username}
                                        </h3>
                                        <p className="text-xs text-gray-400">{friend.email}</p>
                                    </div>
                                </div>

                                <FiChevronRight className="text-gray-300 group-hover:text-blue-500" />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-400">
                            {searchQuery
                                ? "No friends found matching that name."
                                : "No friends yet. Add one above!"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Friends;
