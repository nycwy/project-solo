import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import Button from "../../components/Button";
import Input from "../../components/Input";
import {
    FiArrowUpCircle,
    FiArrowDownCircle,
    FiTrash2,
    FiCalendar,
    FiActivity,
} from "react-icons/fi";

const Journal = () => {
    const { user } = useContext(AuthContext);

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    // Income State
    const [incAmount, setIncAmount] = useState("");
    const [incDesc, setIncDesc] = useState("");
    const [incDate, setIncDate] = useState(
        new Date().toISOString().split("T")[0],
    );

    // Expense State
    const [expAmount, setExpAmount] = useState("");
    const [expDesc, setExpDesc] = useState("");
    const [expDate, setExpDate] = useState(
        new Date().toISOString().split("T")[0],
    );

    // 1. Fetch Data
    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, "journal"), where("uid", "==", user.uid));

        const unsub = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // Client-side Sort (Newest First)
                data.sort((a, b) => {
                    const dateA = a.date?.seconds || 0;
                    const dateB = b.date?.seconds || 0;
                    return dateB - dateA;
                });

                setEntries(data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching journal:", error);
                setLoading(false);
            },
        );

        return () => unsub();
    }, [user]);

    // 2. Calculations
    const totalIncome = entries
        .filter((e) => e.type === "income")
        .reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = entries
        .filter((e) => e.type === "expense")
        .reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    // 3. Handlers
    const handleAddEntry = async (type) => {
        const isIncome = type === "income";
        const amountVal = parseFloat(isIncome ? incAmount : expAmount);
        const descVal = isIncome ? incDesc : expDesc;
        const dateVal = isIncome ? incDate : expDate;

        if (!amountVal || amountVal <= 0)
            return alert("Please enter a valid amount");
        if (!descVal.trim()) return alert("Please enter a description");

        try {
            const entryDate = new Date(dateVal);
            entryDate.setHours(12, 0, 0, 0);

            await addDoc(collection(db, "journal"), {
                uid: user.uid,
                type: type,
                amount: amountVal,
                description: descVal,
                date: Timestamp.fromDate(entryDate),
                createdAt: serverTimestamp(),
            });

            if (isIncome) {
                setIncAmount("");
                setIncDesc("");
                setIncDate(new Date().toISOString().split("T")[0]);
            } else {
                setExpAmount("");
                setExpDesc("");
                setExpDate(new Date().toISOString().split("T")[0]);
            }
        } catch (error) {
            console.error("Error adding entry:", error);
            alert("Failed to save entry.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this entry?")) {
            await deleteDoc(doc(db, "journal", id));
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Unknown";
        return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
    };

    // Shared Date Input Style to match your custom Input component
    const dateInputClass =
        "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm outline-none transition appearance-none";

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <FiActivity size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                        Personal Journal
                    </h1>
                    <p className="text-xs text-gray-400">Track your finances</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
                <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm text-center flex flex-col justify-center">
                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                        Income
                    </p>
                    <p className="text-green-600 font-bold text-sm md:text-lg truncate">
                        +Rs.{totalIncome.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm text-center flex flex-col justify-center">
                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                        Expense
                    </p>
                    <p className="text-red-500 font-bold text-sm md:text-lg truncate">
                        -Rs.{totalExpense.toLocaleString()}
                    </p>
                </div>
                <div className="bg-blue-600 p-3 md:p-4 rounded-xl shadow-lg text-center text-white flex flex-col justify-center">
                    <p className="text-[10px] md:text-xs text-blue-200 uppercase font-bold tracking-wider mb-1">
                        Balance
                    </p>
                    <p className="font-bold text-sm md:text-lg truncate">
                        Rs.{balance.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* INPUT SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
                {/* 1. INCOME CARD */}
                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border-t-4 border-green-500 transition hover:shadow-md">
                    <div className="flex items-center gap-2 mb-4 text-green-600">
                        <FiArrowUpCircle size={20} />
                        <h2 className="font-bold text-gray-800 text-sm md:text-base">
                            Add Income
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {/* Row 1: Amount & Date */}
                        <div className="grid grid-cols-2 gap-3 items-start">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">
                                    Amount
                                </label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={incAmount}
                                    setValue={setIncAmount}
                                    className="text-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    className={`${dateInputClass} focus:border-green-500`}
                                    value={incDate}
                                    onChange={(e) => setIncDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Row 2: Description */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">
                                Description
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Salary"
                                value={incDesc}
                                setValue={setIncDesc}
                                className="text-sm"
                            />
                        </div>

                        <Button
                            text="Save Income"
                            onClick={() => handleAddEntry("income")}
                            className="bg-green-600 hover:bg-green-700 w-full mt-2 text-sm"
                        />
                    </div>
                </div>

                {/* 2. EXPENSE CARD */}
                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border-t-4 border-red-500 transition hover:shadow-md">
                    <div className="flex items-center gap-2 mb-4 text-red-500">
                        <FiArrowDownCircle size={20} />
                        <h2 className="font-bold text-gray-800 text-sm md:text-base">
                            Add Expense
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {/* Row 1: Amount & Date */}
                        <div className="grid grid-cols-2 gap-3 items-start">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">
                                    Amount
                                </label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={expAmount}
                                    setValue={setExpAmount}
                                    className="text-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    className={`${dateInputClass} focus:border-red-500`}
                                    value={expDate}
                                    onChange={(e) => setExpDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Row 2: Description */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">
                                Description
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Rent"
                                value={expDesc}
                                setValue={setExpDesc}
                                className="text-sm"
                            />
                        </div>

                        <Button
                            text="Save Expense"
                            onClick={() => handleAddEntry("expense")}
                            className="bg-red-500 hover:bg-red-600 w-full mt-2 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* History List */}
            <div>
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-4">
                    Recent History
                </h3>

                {loading ? (
                    <p className="text-center text-gray-400 py-8 animate-pulse text-sm">
                        Loading...
                    </p>
                ) : (
                    <div className="space-y-3">
                        {entries.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-400 text-sm">No entries yet.</p>
                                <p className="text-xs text-gray-300 mt-1">
                                    Start tracking today!
                                </p>
                            </div>
                        ) : (
                            entries.map((e) => (
                                <div
                                    key={e.id}
                                    className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-blue-200 transition"
                                >
                                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden min-w-0">
                                        <div
                                            className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full flex items-center justify-center text-lg shadow-sm ${e.type === "income" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}
                                        >
                                            {e.type === "income" ? (
                                                <FiArrowUpCircle />
                                            ) : (
                                                <FiArrowDownCircle />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-gray-800 text-sm truncate">
                                                {e.description}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] text-gray-400 mt-0.5">
                                                <FiCalendar size={10} />
                                                {formatDate(e.date)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 md:gap-4 ml-2 shrink-0">
                                        <span
                                            className={`font-bold text-sm md:text-base whitespace-nowrap ${e.type === "income" ? "text-green-600" : "text-red-500"}`}
                                        >
                                            {e.type === "income" ? "+" : "-"}Rs.
                                            {e.amount.toLocaleString()}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(e.id)}
                                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Journal;
