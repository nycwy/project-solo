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
import { FiArrowLeft, FiCheck, FiClock, FiAlertCircle } from "react-icons/fi";

const FriendDetails = () => {
    const { id: friendId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [friend, setFriend] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Friend Info
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

    // 2. Real-time Transactions Listener
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
                role: "payer", // I paid
            }));

            if (unsub2) unsub2();

            unsub2 = onSnapshot(q2, (snap2) => {
                const list2 = snap2.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                    role: "debtor", // I owe
                }));

                const merged = [...list1, ...list2].sort((a, b) => {
                    return (b.date?.seconds || 0) - (a.date?.seconds || 0);
                });

                setTransactions(merged);
                setLoading(false);
            });
        });

        return () => {
            unsub1();
            if (unsub2) unsub2();
        };
    }, [user, friendId]);

    // Calculate Net Balance
    let balance = 0;
    transactions.forEach((t) => {
        if (t.settleStatus !== "settled") {
            if (t.role === "payer") balance += t.amount;
            else balance -= t.amount;
        }
    });

    // Handlers
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

    if (!friend && loading)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header Card (Sticky) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 mb-6 sticky top-20 z-10 transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 md:gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 -ml-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                            >
                                <FiArrowLeft size={22} />
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-none">
                                    {friend?.username || "Unknown"}
                                </h1>
                                <p className="text-xs text-gray-400 mt-1">{friend?.email}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                                Net Balance
                            </p>
                            <div
                                className={`flex flex-col items-end ${balance >= 0 ? "text-green-600" : "text-red-500"}`}
                            >
                                <span className="text-xs font-semibold">
                                    {balance >= 0 ? "You get back" : "You owe"}
                                </span>
                                <span className="text-xl md:text-3xl font-bold font-mono">
                                    रु {Math.abs(balance).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-3 pb-24">
                    {transactions.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                            <div className="p-4 bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <FiClock size={24} />
                            </div>
                            <p className="text-gray-500 font-medium">No transactions yet.</p>
                            <p className="text-xs text-gray-400 mt-1 mb-6">
                                Start tracking expenses together!
                            </p>
                            <Button
                                text="Add Expense"
                                className="bg-blue-100 text-blue-600 px-6 py-2.5 w-auto hover:bg-blue-600 hover:text-white rounded-xl text-sm font-bold shadow-none"
                                onClick={() => navigate("/add-expense")}
                            />
                        </div>
                    ) : (
                        transactions.map((t) => (
                            <div
                                key={t.id}
                                className={`group bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition-all hover:shadow-md hover:border-blue-100 ${t.settleStatus === "settled"
                                        ? "opacity-60 bg-gray-50 grayscale-[0.5]"
                                        : ""
                                    }`}
                            >
                                {/* Left: Info */}
                                <div className="flex-1 min-w-0 pr-3">
                                    <p
                                        className={`font-bold text-gray-800 text-sm md:text-base truncate ${t.settleStatus === "settled" ? "line-through text-gray-500" : ""}`}
                                    >
                                        {t.description}
                                    </p>
                                    <p className="text-[10px] md:text-xs text-gray-400 mt-1 flex items-center gap-1">
                                        {t.date
                                            ? new Date(t.date.seconds * 1000).toLocaleDateString(
                                                undefined,
                                                {
                                                    month: "short",
                                                    day: "numeric",
                                                },
                                            )
                                            : "Just now"}
                                        {t.settleStatus === "settled" && (
                                            <span className="flex items-center text-green-600 ml-1 font-medium bg-green-50 px-1 rounded">
                                                <FiCheck size={10} className="mr-0.5" /> Settled
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Right: Amount & Actions */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span
                                        className={`font-bold font-mono text-sm md:text-base ${t.settleStatus === "settled"
                                                ? "text-gray-400"
                                                : t.role === "payer"
                                                    ? "text-green-600"
                                                    : "text-red-500"
                                            }`}
                                    >
                                        {t.role === "payer" ? "+" : "-"} रु {t.amount}
                                    </span>

                                    {/* Action Buttons Logic */}
                                    <div className="flex items-center">
                                        {/* Case 1: I owe money -> Settle Button */}
                                        {t.role === "debtor" && !t.settleStatus && (
                                            <button
                                                onClick={() => handleSettle(t)}
                                                className="text-[10px] md:text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide hover:bg-blue-600 hover:text-white transition-colors"
                                            >
                                                Settle
                                            </button>
                                        )}

                                        {/* Case 2: I Paid -> Waiting for Confirmation */}
                                        {t.role === "payer" &&
                                            t.settleStatus === "pending_confirmation" && (
                                                <button
                                                    onClick={() => handleConfirm(t)}
                                                    className="flex items-center gap-1 text-[10px] md:text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold uppercase animate-pulse hover:bg-green-700 shadow-md shadow-green-200"
                                                >
                                                    <FiCheck size={12} /> Confirm
                                                </button>
                                            )}

                                        {/* Case 3: I Owe -> Waiting for them to confirm */}
                                        {t.settleStatus === "pending_confirmation" &&
                                            t.role === "debtor" && (
                                                <span className="flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md font-bold uppercase border border-yellow-200">
                                                    <FiClock size={10} /> Waiting
                                                </span>
                                            )}
                                    </div>
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
