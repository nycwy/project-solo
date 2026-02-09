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
import { FiArrowLeft } from "react-icons/fi";

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
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 animate-pulse">Loading...</p>
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 sticky top-20 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition"
                            >
                                <FiArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                                    {friend.username}
                                </h1>
                                <p className="text-xs text-gray-400">{friend.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                Net Balance
                            </p>
                            <p
                                className={`text-lg md:text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-500"}`}
                            >
                                {balance >= 0 ? "You are owed" : "You owe"}
                                <span className="block text-xl md:text-3xl mt-1">
                                    रु {Math.abs(balance).toFixed(2)}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-3 pb-24">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                            <p className="text-gray-400 font-medium">No expenses yet.</p>
                            <Button
                                text="Add Expense"
                                className="mt-4 bg-blue-50 text-blue-600 px-6 py-2 w-auto"
                                onClick={() => navigate("/add-expense")}
                            />
                        </div>
                    ) : (
                        transactions.map((t) => (
                            <div
                                key={t.id}
                                className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:shadow-md ${t.settleStatus === "settled" ? "opacity-60 bg-gray-50" : ""}`}
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <p
                                        className={`font-bold text-gray-800 text-sm md:text-base truncate ${t.settleStatus === "settled" ? "line-through text-gray-500" : ""}`}
                                    >
                                        {t.description}
                                    </p>
                                    <p className="text-[10px] md:text-xs text-gray-400 mt-1">
                                        {t.date
                                            ? new Date(t.date.seconds * 1000).toLocaleDateString(
                                                undefined,
                                                {
                                                    month: "short",
                                                    day: "numeric",
                                                },
                                            )
                                            : "Just now"}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span
                                        className={`font-bold text-sm md:text-base ${t.role === "payer" ? "text-green-600" : "text-red-500"} ${t.settleStatus === "settled" ? "line-through text-gray-400" : ""}`}
                                    >
                                        {t.role === "payer" ? "+" : "-"}रु {t.amount}
                                    </span>

                                    {t.role === "debtor" && !t.settleStatus && (
                                        <button
                                            onClick={() => handleSettle(t)}
                                            className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold uppercase hover:bg-blue-600 hover:text-white transition"
                                        >
                                            Settle
                                        </button>
                                    )}
                                    {t.role === "payer" &&
                                        t.settleStatus === "pending_confirmation" && (
                                            <button
                                                onClick={() => handleConfirm(t)}
                                                className="text-[10px] bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold uppercase animate-pulse hover:bg-green-700"
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
        </div>
    );
};

export default FriendDetails;