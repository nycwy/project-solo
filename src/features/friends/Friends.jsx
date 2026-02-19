import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    arrayUnion,
    onSnapshot,
    addDoc,
    serverTimestamp,
    deleteDoc,
} from "firebase/firestore";
import Button from "../../components/Button";
import Input from "../../components/Input";
import {
    FiUserPlus,
    FiSearch,
    FiChevronRight,
    FiUsers,
    FiCheck,
    FiX,
    FiUserMinus, // <--- New Icon
} from "react-icons/fi";

const Friends = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [friendsList, setFriendsList] = useState([]);
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Add Friend Form State
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // --- LISTENERS (Same as before) ---
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setFriendsList(docSnap.data().friendsList || []);
            }
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "friend_requests"),
            where("toId", "==", user.uid),
            where("status", "==", "pending"),
        );
        const unsub = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, [user]);

    // --- ACTIONS ---

    // 1. SEND REQUEST (Same as before)
    const handleSendRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const targetEmail = email.toLowerCase().trim();
            if (targetEmail === user.email)
                throw new Error("You cannot add yourself.");

            const myDocSnap = await getDoc(doc(db, "users", user.uid));
            if (!myDocSnap.exists()) throw new Error("Your profile error.");
            const myData = myDocSnap.data();
            const myName = myData.username || user.email.split("@")[0];

            const q = query(
                collection(db, "users"),
                where("email", "==", targetEmail),
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("User not found. Ask them to sign up!");
            }

            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();
            const friendId = friendDoc.id;

            const alreadyFriends = friendsList.some((f) => f.uid === friendId);
            if (alreadyFriends) throw new Error("You are already friends!");

            const pendingQ = query(
                collection(db, "friend_requests"),
                where("fromId", "==", user.uid),
                where("toId", "==", friendId),
            );
            const pendingSnap = await getDocs(pendingQ);
            if (!pendingSnap.empty) throw new Error("Request already sent!");

            await addDoc(collection(db, "friend_requests"), {
                fromId: user.uid,
                fromName: myName,
                fromEmail: user.email,
                toId: friendId,
                status: "pending",
                createdAt: serverTimestamp(),
            });

            setMessage(`Request sent to ${friendData.username}!`);
            setEmail("");
        } catch (error) {
            setMessage(error.message);
        }
        setLoading(false);
    };

    const handleUnfriend = async (e, friendId, friendName) => {
        e.stopPropagation();

        if (!window.confirm(`Are you sure you want to remove ${friendName}?`))
            return;

        try {
            const q1 = query(
                collection(db, "transactions"),
                where("payerId", "==", user.uid),
                where("debtorId", "==", friendId),
            );

            const q2 = query(
                collection(db, "transactions"),
                where("payerId", "==", friendId),
                where("debtorId", "==", user.uid),
            );

            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            const allTransactions = [...snap1.docs, ...snap2.docs].map((d) =>
                d.data(),
            );

            const hasUnsettledDebt = allTransactions.some(
                (t) => t.settleStatus !== "settled",
            );

            if (hasUnsettledDebt) {
                alert(
                    `Cannot remove ${friendName}. There are outstanding debts (unsettled transactions) between you. Please settle them first.`,
                );
                return;
            }
            const myRef = doc(db, "users", user.uid);
            const mySnap = await getDoc(myRef);
            if (mySnap.exists()) {
                const myList = mySnap.data().friendsList || [];
                const updatedMyList = myList.filter((f) => f.uid !== friendId);
                await updateDoc(myRef, { friendsList: updatedMyList });
            }

            const friendRef = doc(db, "users", friendId);
            const friendSnap = await getDoc(friendRef);
            if (friendSnap.exists()) {
                const theirList = friendSnap.data().friendsList || [];
                const updatedTheirList = theirList.filter((f) => f.uid !== user.uid);
                await updateDoc(friendRef, { friendsList: updatedTheirList });
            }

            alert(`${friendName} removed from connections.`);
        } catch (error) {
            console.error(error);
            alert("Error removing friend.");
        }
    };

    const handleAccept = async (req) => {
        try {
            await updateDoc(doc(db, "users", user.uid), {
                friendsList: arrayUnion({
                    uid: req.fromId,
                    email: req.fromEmail,
                    username: req.fromName,
                }),
            });

            const myDocSnap = await getDoc(doc(db, "users", user.uid));
            const myData = myDocSnap.data();
            const myName = myData.username || user.email;

            await updateDoc(doc(db, "users", req.fromId), {
                friendsList: arrayUnion({
                    uid: user.uid,
                    email: user.email,
                    username: myName,
                }),
            });

            await deleteDoc(doc(db, "friend_requests", req.id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDecline = async (reqId) => {
        try {
            await deleteDoc(doc(db, "friend_requests", reqId));
        } catch (error) {
            console.error(error);
        }
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
                            Connections
                        </h1>
                        <p className="text-xs text-gray-400">
                            {friendsList.length} Friends
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* SEND REQUEST CARD */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 transition hover:shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FiUserPlus /> Add New Contact
                        </h2>
                        <form onSubmit={handleSendRequest} className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="friend@email.com"
                                value={email}
                                setValue={setEmail}
                                className="text-sm bg-gray-50"
                            />
                            <Button
                                text={loading ? "..." : "Send"}
                                disabled={loading || !email}
                                className="w-auto px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700"
                            />
                        </form>
                        {message && (
                            <div
                                className={`mt-3 p-2 rounded-lg text-xs font-bold text-center ${message.includes("sent") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
                            >
                                {message}
                            </div>
                        )}
                    </div>

                    {/* INCOMING REQUESTS */}
                    {requests.length > 0 && (
                        <div>
                            <h3 className="text-orange-600 font-bold text-xs uppercase mb-2 tracking-wider ml-1">
                                Pending Requests ({requests.length})
                            </h3>
                            <div className="space-y-2">
                                {requests.map((req) => (
                                    <div
                                        key={req.id}
                                        className="bg-white border-l-4 border-orange-500 p-4 rounded-xl shadow-sm flex items-center justify-between transition hover:shadow-md"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">
                                                {req.fromName}
                                            </p>
                                            <p className="text-xs text-gray-400">{req.fromEmail}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAccept(req)}
                                                className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition"
                                            >
                                                <FiCheck />
                                            </button>
                                            <button
                                                onClick={() => handleDecline(req.id)}
                                                className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FRIENDS LIST */}
                    <div className="pt-2">
                        <div className="relative mb-4">
                            <FiSearch
                                className="absolute left-4 top-3.5 text-gray-400"
                                size={18}
                            />
                            <input
                                type="text"
                                placeholder="Search friends..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm text-gray-700"
                            />
                        </div>

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

                                        <div className="flex items-center gap-2">
                                            {/* UNFRIEND BUTTON */}
                                            <button
                                                onClick={(e) =>
                                                    handleUnfriend(e, friend.uid, friend.username)
                                                }
                                                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition z-10"
                                                title="Unfriend"
                                            >
                                                <FiUserMinus size={18} />
                                            </button>

                                            <FiChevronRight className="text-gray-300 group-hover:text-blue-500 transition" />
                                        </div>
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
        </div>
    );
};;

export default Friends;
