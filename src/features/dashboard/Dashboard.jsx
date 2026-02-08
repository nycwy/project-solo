import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import Button from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [userProfile, setUserProfile] = useState(null);

    const [payerTransactions, setPayerTransactions] = useState([]);
    const [debtorTransactions, setDebtorTransactions] = useState([]);

    const handleLogout = () => {
        navigate("/logout");
    };

    useEffect(() => {
        if (!user || !user.uid) return;
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) setUserProfile(doc.data());
        });
        return () => unsubUser();
    }, [user]);

    useEffect(() => {
        if (!user || !user.uid) return;

        const q = query(
            collection(db, "transactions"),
            where("payerId", "==", user.uid),
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                role: "payer",
            }));
            console.log("Found Payer Docs:", docs.length);
            setPayerTransactions(docs);
        });

        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user || !user.uid) return;

        const q = query(
            collection(db, "transactions"),
            where("debtorId", "==", user.uid),
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                role: "debtor",
            }));
            console.log("Found Debtor Docs:", docs.length);
            setDebtorTransactions(docs);
        });

        return () => unsub();
    }, [user]);
    const allTransactions = [...payerTransactions, ...debtorTransactions];

    allTransactions.sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return dateB - dateA;
    });

    let totalOwedToMe = 0;
    let totalDebtIOwe = 0;

    allTransactions.forEach((t) => {
        if (t.role === "payer") {
            if (t.debtorId !== "SELF") {
                totalOwedToMe += t.amount;
            }
        } else {
            totalDebtIOwe += t.amount;
        }
    });

    const netBalance = totalOwedToMe - totalDebtIOwe;

    console.log("---------------- DIAGNOSTIC ----------------");
    console.log("MY USER ID IS:", user?.uid);
    console.log("Payer List Size:", payerTransactions.length);
    console.log("Debtor List Size:", debtorTransactions.length);
    console.log("--------------------------------------------");

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        Hello, {userProfile?.username || "Friend"} 👋
                    </h2>
                    <button
                        onClick={() => navigate("/add-friend")}
                        className="text-blue-600 text-xs font-bold uppercase tracking-wide hover:underline mt-1"
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

            <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-lg mb-8">
                <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">
                    Net Balance
                </p>
                <h3 className="text-4xl font-bold my-2">
                    {netBalance >= 0 ? "+" : "-"}${Math.abs(netBalance).toFixed(2)}
                </h3>

                <div className="flex mt-6 pt-4 border-t border-blue-500/50">
                    <div className="w-1/2">
                        <p className="text-blue-200 text-xs">You are owed</p>
                        <p className="text-green-300 font-bold text-lg">
                            +${totalOwedToMe.toFixed(2)}
                        </p>
                    </div>
                    <div className="w-1/2 text-right">
                        <p className="text-blue-200 text-xs">You owe</p>
                        <p className="text-red-300 font-bold text-lg">
                            -${totalDebtIOwe.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                    onClick={() => navigate("/add-expense")}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-gray-50 transition"
                >
                    <span className="text-2xl mb-2">💸</span>
                    <span className="font-semibold text-gray-700">Add Expense</span>
                </button>
                <button className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-gray-50 transition">
                    <span className="text-2xl mb-2">🤝</span>
                    <span className="font-semibold text-gray-700">Settle Up</span>
                </button>
            </div>

            <div>
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-3">
                    Recent Transactions
                </h3>
                <div className="space-y-3">
                    {allTransactions.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">
                            No recent activity.
                        </p>
                    ) : (
                        allTransactions.map((t) => (
                            <div
                                key={t.id}
                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center"
                            >
                                <div>
                                    <p className="font-bold text-gray-800">{t.description}</p>
                                    <p className="text-xs text-gray-400">
                                        {/* Dynamic Text Logic */}
                                        {t.role === "payer"
                                            ? t.debtorId === "SELF"
                                                ? "Personal Expense"
                                                : "You lent money"
                                            : "You borrowed money"}
                                        {" • "}
                                        {t.date
                                            ? new Date(t.date.seconds * 1000).toLocaleDateString()
                                            : "Just now"}
                                    </p>
                                </div>
                                <span
                                    className={`font-bold ${t.role === "payer" ? "text-green-600" : "text-red-500"}`}
                                >
                                    {t.role === "payer" ? "+" : "-"}${t.amount}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
