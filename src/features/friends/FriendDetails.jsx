import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
} from "firebase/firestore";
import Button from "../../components/Button";

const FriendDetails = () => {
    const { id: friendId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [friend, setFriend] = useState(null);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        const fetchFriend = async () => {
            try {
                const docSnap = await getDoc(doc(db, "users", friendId));
                if (docSnap.exists()) {
                    setFriend(docSnap.data());
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchFriend();
    }, [friendId]);

    useEffect(() => {
        if (!user?.uid || !friendId) return;

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

        let unsub2 = null;

        const unsub1 = onSnapshot(q1, (snap1) => {
            const list1 = snap1.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                role: "payer",
            }));

            if (unsub2) unsub2();

            unsub2 = onSnapshot(q2, (snap2) => {
                const list2 = snap2.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                    role: "debtor",
                }));

                const merged = [...list1, ...list2].sort((a, b) => {
                    return (b.date?.seconds || 0) - (a.date?.seconds || 0);
                });

                setTransactions(merged);
            });
        });

        return () => {
            unsub1();
            if (unsub2) unsub2();
        };
    }, [user, friendId]);

    let balance = 0;
    transactions.forEach((t) => {
        if (t.settleStatus !== "settled") {
            if (t.role === "payer") balance += t.amount;
            else balance -= t.amount;
        }
    });

    const handleSettle = async (t) => {
        try {
            await updateDoc(doc(db, "transactions", t.id), {
                settleStatus: "pending_confirmation",
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleConfirm = async (t) => {
        try {
            await updateDoc(doc(db, "transactions", t.id), {
                settleStatus: "settled",
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (!friend)
        return <div className="p-6 text-center text-gray-400">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate("/")}
                    className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                    ← Back
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-800">
                        {friend.username}
                    </h1>
                    <p className="text-xs text-gray-400">{friend.email}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-bold">
                        Net Balance
                    </p>
                    <p
                        className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-500"}`}
                    >
                        {balance >= 0 ? "You are owed " : "You owe "}
                        {`रु ${Math.abs(balance).toFixed(2)}`}
                    </p>
                </div>
            </div>

            <div className="space-y-3 pb-20">
                {transactions.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl text-center text-gray-400 shadow-sm">
                        <p>No expenses with {friend.username} yet.</p>
                        <Button
                            text="Add Expense"
                            className="mt-4 bg-blue-50 text-blue-600 px-4 py-2"
                            onClick={() => navigate("/add-expense")}
                        />
                    </div>
                ) : (
                    transactions.map((t) => (
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
                                    {t.date
                                        ? new Date(t.date.seconds * 1000).toLocaleDateString()
                                        : "Just now"}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                                <span
                                    className={`font-bold ${t.role === "payer" ? "text-green-600" : "text-red-500"} ${t.settleStatus === "settled" ? "line-through text-gray-400" : ""}`}
                                >
                                    {t.role === "payer" ? "+" : "-"}रु {t.amount}
                                </span>

                                {t.role === "debtor" && !t.settleStatus && (
                                    <button
                                        onClick={() => handleSettle(t)}
                                        className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase hover:bg-blue-600 hover:text-white transition"
                                    >
                                        Settle
                                    </button>
                                )}
                                {t.role === "payer" &&
                                    t.settleStatus === "pending_confirmation" && (
                                        <button
                                            onClick={() => handleConfirm(t)}
                                            className="text-[10px] bg-green-600 text-white px-2 py-1 rounded font-bold uppercase animate-pulse"
                                        >
                                            Confirm
                                        </button>
                                    )}
                                {t.settleStatus === "pending_confirmation" &&
                                    t.role === "debtor" && (
                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold uppercase">
                                            Waiting
                                        </span>
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
        </div>
    );
};

export default FriendDetails;
