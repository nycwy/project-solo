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
import { FiUserPlus, FiSearch, FiChevronRight, FiUsers } from "react-icons/fi";

const Friends = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [friendsList, setFriendsList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setFriendsList(docSnap.data().friendsList || []);
            }
        });
        return () => unsub();
    }, [user]);

    const handleAddFriend = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            if (email === user.email) throw new Error("You cannot add yourself.");

            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("User not found. Ask them to sign up!");
            }

            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();
            const friendId = friendDoc.id;

            const alreadyFriends = friendsList.some((f) => f.uid === friendId);
            if (alreadyFriends) throw new Error("You are already friends!");

            await updateDoc(doc(db, "users", user.uid), {
                friendsList: arrayUnion({
                    uid: friendId,
                    email: friendData.email,
                    username: friendData.username || "Friend",
                }),
            });

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

    const filteredFriends = friendsList.filter(
        (f) =>
            f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24">
            <div className="max-w-xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <FiUsers size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                            My Friends
                        </h1>
                        <p className="text-xs text-gray-400">
                            {friendsList.length} Total Connections
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Add Friend Card */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 transition hover:shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
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
                                className="w-auto px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700"
                            />
                        </form>
                        {message && (
                            <div
                                className={`mt-3 p-2 rounded-lg text-xs font-bold text-center ${message.includes("Success") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
                            >
                                {message}
                            </div>
                        )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <FiSearch
                            className="absolute left-4 top-3.5 text-gray-400"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm text-gray-700 placeholder-gray-400"
                        />
                    </div>

                    {/* Friends List */}
                    <div className="space-y-3">
                        {filteredFriends.length > 0 ? (
                            filteredFriends.map((friend) => (
                                <div
                                    key={friend.uid}
                                    onClick={() => navigate(`/friend/${friend.uid}`)}
                                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-md transition group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition">
                                            {friend.username[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-sm md:text-base">
                                                {friend.username}
                                            </h3>
                                            <p className="text-xs text-gray-400">{friend.email}</p>
                                        </div>
                                    </div>
                                    <FiChevronRight className="text-gray-300 group-hover:text-blue-500 transition" />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">
                                    {searchQuery
                                        ? "No matching friends found."
                                        : "No friends yet."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Friends;
