import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import Button from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    updateDoc,
    arrayUnion,
    deleteDoc,
} from "firebase/firestore";

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [userProfile, setUserProfile] = useState(null);
    const [payerTransactions, setPayerTransactions] = useState([]);
    const [debtorTransactions, setDebtorTransactions] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);

    const handleLogout = () => navigate("/logout");

    useEffect(() => {
        if (!user?.uid) return;
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) setUserProfile(doc.data());
        });
        return () => unsubUser();
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "friend_requests"),
            where("toId", "==", user.uid),
            where("status", "==", "pending"),
        );
        const unsub = onSnapshot(q, (snapshot) => {
            setIncomingRequests(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            );
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubP = onSnapshot(
            query(collection(db, "transactions"), where("payerId", "==", user.uid)),
            (s) =>
                setPayerTransactions(
                    s.docs.map((d) => ({ id: d.id, ...d.data(), role: "payer" })),
                ),
        );
        const unsubD = onSnapshot(
            query(collection(db, "transactions"), where("debtorId", "==", user.uid)),
            (s) =>
                setDebtorTransactions(
                    s.docs.map((d) => ({ id: d.id, ...d.data(), role: "debtor" })),
                ),
        );
        return () => {
            unsubP();
            unsubD();
        };
    }, [user]);

    const getFriendName = (targetId) => {
        if (targetId === "SELF") return "Yourself";
        if (targetId === user?.uid) return "You";

        const friend = userProfile?.friendsList?.find((f) => f.uid === targetId);
        return friend ? friend.username : "Unknown";
    };

    const handleAcceptFriend = async (request) => {
        try {
            const myRef = doc(db, "users", user.uid);
            const senderRef = doc(db, "users", request.fromId);
            const requestRef = doc(db, "friend_requests", request.id);

            const myData = {
                uid: request.fromId,
                email: request.fromEmail,
                username: request.fromName,
            };
            const senderData = {
                uid: user.uid,
                email: user.email,
                username: userProfile?.username || "A Friend",
            };

            await updateDoc(myRef, { friendsList: arrayUnion(myData) });
            await updateDoc(senderRef, { friendsList: arrayUnion(senderData) });
            await updateDoc(requestRef, { status: "accepted" });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeclineFriend = async (requestId) => {
        try {
            await deleteDoc(doc(db, "friend_requests", requestId));
        } catch (e) {
            console.error(e);
        }
    };

    const handleRequestSettle = async (transactionId) => {
        try {
            await updateDoc(doc(db, "transactions", transactionId), {
                settleStatus: "pending_confirmation",
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleConfirmSettle = async (transactionId) => {
        try {
            await updateDoc(doc(db, "transactions", transactionId), {
                settleStatus: "settled",
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeclineSettle = async (transactionId) => {
        try {
            await updateDoc(doc(db, "transactions", transactionId), {
                settleStatus: null,
            });
        } catch (e) {
            console.error(e);
        }
    };

    const allTransactions = [...payerTransactions, ...debtorTransactions].sort(
        (a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0),
    );

    let owed = 0,
        debt = 0;
    allTransactions.forEach((t) => {
        if (t.settleStatus !== "settled") {
            if (t.role === "payer" && t.debtorId !== "SELF") owed += t.amount;
            else if (t.role === "debtor") debt += t.amount;
        }
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        Hello, {userProfile?.username || "Friend"}
                    </h2>
                    <button
                        onClick={() => navigate("/add-friend")}
                        className="text-blue-600 text-xs font-bold uppercase mt-1 hover:underline"
                    >
                        + Add Friend
                    </button>
                </div>
                <Button
                    text="Logout"
                    onClick={handleLogout}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded-lg"
                />
            </div>

            {incomingRequests.length > 0 && (
                <div className="mb-6 space-y-2">
                    <h3 className="text-orange-600 font-bold text-xs uppercase mb-1">
                        New Friend Requests
                    </h3>
                    {incomingRequests.map((req) => (
                        <div
                            key={req.id}
                            className="bg-white border-l-4 border-orange-500 p-4 rounded-xl shadow-sm flex justify-between items-center"
                        >
                            <div>
                                <p className="text-sm font-bold text-gray-800">
                                    {req.fromName}
                                </p>
                                <p className="text-[10px] text-gray-400">wants to connect</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAcceptFriend(req)}
                                    className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleDeclineFriend(req.id)}
                                    className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-lg mb-8 transition-all hover:shadow-xl">
                <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">
                    Net Balance
                </p>
                <h3 className="text-4xl font-bold my-2">
                    {owed - debt >= 0 ? "+" : "-"}${Math.abs(owed - debt).toFixed(2)}
                </h3>
                <div className="flex mt-6 pt-4 border-t border-blue-500/50">
                    <div className="w-1/2">
                        <p className="text-blue-200 text-xs">Owed to you</p>
                        <p className="text-green-300 font-bold text-lg">
                            +${owed.toFixed(2)}
                        </p>
                    </div>
                    <div className="w-1/2 text-right">
                        <p className="text-blue-200 text-xs">You owe</p>
                        <p className="text-red-300 font-bold text-lg">
                            -${debt.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-gray-500 font-bold text-xs uppercase mb-3 tracking-wider">
                    Your Friends
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {userProfile?.friendsList?.length > 0 ? (
                        userProfile.friendsList.map((f) => (
                            <div
                                key={f.uid}
                                className="shrink-0 flex flex-col items-center"
                            >
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 text-blue-600 font-bold mb-1 text-xl">
                                    {f.username[0].toUpperCase()}
                                </div>
                                <span className="text-[10px] text-gray-600 font-medium truncate w-16 text-center">
                                    {f.username.split(" ")[0]}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div
                            onClick={() => navigate("/add-friend")}
                            className="flex items-center gap-2 p-3 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400 text-sm cursor-pointer w-full justify-center"
                        >
                            <span>+ Add your first friend</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center mb-3">
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">
                    Recent Activity
                </h3>
            </div>

            <div className="space-y-3">
                {allTransactions.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">
                        No expenses yet. Add one below!
                    </p>
                ) : (
                    allTransactions.map((t) => (
                        <div
                            key={t.id}
                            className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center ${t.settleStatus === "settled" ? "opacity-50" : ""}`}
                        >
                            <div className="flex-1">
                                <p
                                    className={`font-bold text-gray-800 ${t.settleStatus === "settled" ? "line-through" : ""}`}
                                >
                                    {t.description}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    {t.role === "payer"
                                        ? t.debtorId === "SELF"
                                            ? "Personal Expense"
                                            : `You lent to ${getFriendName(t.debtorId)}`
                                        : `${getFriendName(t.payerId)} lent you`}
                                    {" • "}
                                    {t.date
                                        ? new Date(t.date.seconds * 1000).toLocaleDateString()
                                        : "Just now"}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                                <span
                                    className={`font-bold ${t.role === "payer" ? "text-green-600" : "text-red-500"} ${t.settleStatus === "settled" ? "line-through text-gray-400" : ""}`}
                                >
                                    {t.role === "payer" ? "+" : "-"}${t.amount}
                                </span>

                                {t.role === "payer" && !t.settleStatus && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/edit-expense/${t.id}`);
                                        }}
                                        className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold uppercase hover:bg-gray-200 transition"
                                    >
                                        Edit
                                    </button>
                                )}

                                {t.role === "debtor" && !t.settleStatus && (
                                    <button
                                        onClick={() => handleRequestSettle(t.id)}
                                        className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase hover:bg-blue-600 hover:text-white transition"
                                    >
                                        Settle
                                    </button>
                                )}

                                {t.role === "debtor" &&
                                    t.settleStatus === "pending_confirmation" && (
                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold uppercase">
                                            Waiting...
                                        </span>
                                    )}

                                {t.role === "payer" &&
                                    t.settleStatus === "pending_confirmation" && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleConfirmSettle(t.id)}
                                                className="text-[10px] bg-green-600 text-white px-2 py-1 rounded font-bold uppercase hover:bg-green-700"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleDeclineSettle(t.id)}
                                                className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase hover:bg-red-200"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}

                                {t.settleStatus === "settled" && (
                                    <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-1 rounded font-bold uppercase">
                                        Settled
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => navigate("/add-expense")}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center text-3xl pb-1 hover:bg-blue-700 transition transform hover:scale-105"
            >
                +
            </button>
        </div>
    );
};

export default Dashboard;
