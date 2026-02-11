import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    updateDoc,
    deleteDoc,
    arrayUnion,
} from "firebase/firestore";
import { FiGrid, FiTrash2 } from "react-icons/fi";

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [userProfile, setUserProfile] = useState(null);
    const [payerTransactions, setPayerTransactions] = useState([]);
    const [debtorTransactions, setDebtorTransactions] = useState([]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) setUserProfile(doc.data());
        });
        return () => unsubUser();
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubP = onSnapshot(
            query(collection(db, "transactions"), where("payerId", "==", user.uid)),
            (s) =>
                setPayerTransactions(
                    s.docs
                        .map((d) => ({ id: d.id, ...d.data(), role: "payer" }))
                        .filter((t) => !t.hiddenBy?.includes(user.uid)),
                ),
        );

        const unsubD = onSnapshot(
            query(collection(db, "transactions"), where("debtorId", "==", user.uid)),
            (s) =>
                setDebtorTransactions(
                    s.docs
                        .map((d) => ({ id: d.id, ...d.data(), role: "debtor" }))
                        .filter((t) => !t.hiddenBy?.includes(user.uid)),
                ),
        );

        return () => {
            unsubP();
            unsubD();
        };
    }, [user]);

    const handleAcceptExpense = async (transactionId) => {
        try {
            await updateDoc(doc(db, "transactions", transactionId), {
                status: "confirmed",
            });
        } catch (e) {
            console.error("Oops, couldn't confirm:", e);
        }
    };

    const handleRejectExpense = async (transactionId) => {
        if (!window.confirm("Reject and delete this expense request?")) return;
        try {
            await deleteDoc(doc(db, "transactions", transactionId));
        } catch (e) {
            console.error("Couldn't reject:", e);
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

    const handleDelete = async (e, id) => {
        e.stopPropagation();

        if (window.confirm("Remove this transaction from your history?")) {
            try {
                await updateDoc(doc(db, "transactions", id), {
                    hiddenBy: arrayUnion(user.uid),
                });
            } catch (error) {
                console.error("Error hiding transaction:", error);
                alert("Could not remove.");
            }
        }
    };

    const getFriendName = (targetId) => {
        if (targetId === "SELF") return "Yourself";
        if (targetId === user?.uid) return "You";

        const friend = userProfile?.friendsList?.find((f) => f.uid === targetId);
        return friend ? friend.username : "Unknown";
    };

    const allTransactions = [...payerTransactions, ...debtorTransactions].sort(
        (a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0),
    );

    const activeTransactions = allTransactions.filter(
        (t) =>
            t.status === "confirmed" ||
            (t.status === "pending" && t.role === "payer"),
    );

    const pendingExpenseRequests = allTransactions.filter(
        (t) => t.role === "debtor" && t.status === "pending",
    );

    let owed = 0;
    let debt = 0;

    activeTransactions.forEach((t) => {
        if (t.status === "confirmed" && t.settleStatus !== "settled") {
            if (t.role === "payer" && t.debtorId !== "SELF") {
                owed += t.amount;
            } else if (t.role === "debtor") {
                debt += t.amount;
            }
        }
    });

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-24">
            <div className="max-w-5xl mx-auto">
                
                {/* <div className="flex justify-between items-center mb-6 md:mb-8">
                    <div
                        onClick={() => navigate("/profile")}
                        className="flex items-center gap-3 cursor-pointer group"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg md:text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {userProfile?.username
                                ? userProfile.username[0].toUpperCase()
                                : "?"}
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                                {userProfile?.username || "Friend"}
                            </h2>
                            <p className="text-xs text-gray-400">View Profile</p>
                        </div>
                    </div>
                </div> */}

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <FiGrid size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                            Splitter Dashboard
                        </h1>
                        <p className="text-xs text-gray-400">Overview of shared expenses</p>
                    </div>
                </div>

                {pendingExpenseRequests.length > 0 && (
                    <div className="mb-6 space-y-2">
                        <h3 className="text-purple-600 font-bold text-xs uppercase mb-1 tracking-wider">
                            Expense Requests
                        </h3>
                        {pendingExpenseRequests.map((req) => (
                            <div
                                key={req.id}
                                className="bg-white border-l-4 border-purple-500 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition hover:shadow-md"
                            >
                                <div>
                                    <p className="text-sm font-bold text-gray-800">
                                        {getFriendName(req.payerId)} claims you owe{" "}
                                        <span className="text-red-500">रु {req.amount}</span>
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        For: {req.description}
                                    </p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleAcceptExpense(req.id)}
                                        className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => handleRejectExpense(req.id)}
                                        className="flex-1 sm:flex-none bg-gray-100 text-gray-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-blue-600 text-white rounded-2xl p-6 md:p-8 shadow-lg mb-8 transition-all hover:shadow-xl">
                    <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">
                        Net Balance
                    </p>
                    <h3 className="text-3xl md:text-5xl font-bold my-3">
                        {owed - debt >= 0 ? "+" : "-"}Rs. {Math.abs(owed - debt).toFixed(2)}
                    </h3>
                    <div className="flex mt-6 pt-4 border-t border-blue-500/50">
                        <div className="w-1/2">
                            <p className="text-blue-200 text-xs uppercase font-bold tracking-wide">
                                Owed to you
                            </p>
                            <p className="text-green-300 font-bold text-lg md:text-xl">
                                +Rs. {owed.toFixed(2)}
                            </p>
                        </div>
                        <div className="w-1/2 text-right">
                            <p className="text-blue-200 text-xs uppercase font-bold tracking-wide">
                                You owe
                            </p>
                            <p className="text-red-300 font-bold text-lg md:text-xl">
                                -Rs. {debt.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">
                        Recent Activity
                    </h3>
                </div>

                <div className="space-y-3">
                    {activeTransactions.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                            <p className="text-gray-400 font-medium">No expenses yet.</p>
                            <p className="text-xs text-gray-300 mt-1">
                                Tap the + button to add one!
                            </p>
                        </div>
                    ) : (
                        activeTransactions.map((t) => {
                            const canDelete =
                                t.settleStatus === "settled" || t.debtorId === "SELF";

                            return (
                                <div
                                    key={t.id}
                                    className={`bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center gap-3 group hover:border-blue-200 transition ${t.settleStatus === "settled" ? "opacity-50" : ""}`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`font-bold text-gray-800 text-sm md:text-base truncate ${t.settleStatus === "settled" ? "line-through" : ""}`}
                                        >
                                            {t.description}
                                        </p>
                                        <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 truncate">
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

                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`font-bold text-sm md:text-base ${t.role === "payer" ? "text-green-600" : "text-red-500"} ${t.settleStatus === "settled" ? "line-through text-gray-400" : ""}`}
                                            >
                                                {t.role === "payer" ? "+" : "-"}Rs. {t.amount}
                                            </span>

                                            {canDelete && (
                                                <div className="bg-gray-50 rounded-lg p-1 border border-gray-200">
                                                    <button
                                                        onClick={(e) => handleDelete(e, t.id)}
                                                        className="text-gray-500 hover:text-red-500 transition p-1 rounded-full hover:bg-red-50"
                                                        title="Remove from my history"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {t.status === "pending" && t.role === "payer" && (
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold uppercase">
                                                Pending Approval
                                            </span>
                                        )}

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

                                        {t.status === "confirmed" && (
                                            <>
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
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <button
                    onClick={() => navigate("/add-expense")}
                    className="fixed bottom-20 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center text-3xl pb-1 hover:bg-blue-700 transition transform hover:scale-110 active:scale-95 z-50"
                >
                    +
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
