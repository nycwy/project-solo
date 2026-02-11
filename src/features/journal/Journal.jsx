import React, { useState, useContext, useEffect, useRef } from "react";
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
    updateDoc,
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
    FiEdit2,
} from "react-icons/fi";

const Journal = () => {
    const { user } = useContext(AuthContext);

    const incomeRef = useRef(null);
    const expenseRef = useRef(null);

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [expandedCard, setExpandedCard] = useState(null);

    const [incAmount, setIncAmount] = useState("");
    const [incDesc, setIncDesc] = useState("");
    const [incDate, setIncDate] = useState(
        new Date().toISOString().split("T")[0],
    );

    const [expAmount, setExpAmount] = useState("");
    const [expDesc, setExpDesc] = useState("");
    const [expDate, setExpDate] = useState(
        new Date().toISOString().split("T")[0],
    );

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

    const totalIncome = entries
        .filter((e) => e.type === "income")
        .reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = entries
        .filter((e) => e.type === "expense")
        .reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    const handleSaveEntry = async (type) => {
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
            const timestampDate = Timestamp.fromDate(entryDate);

            if (editingId) {
                const entryRef = doc(db, "journal", editingId);
                await updateDoc(entryRef, {
                    amount: amountVal,
                    description: descVal,
                    date: timestampDate,
                });
                setEditingId(null);
            } else {
                await addDoc(collection(db, "journal"), {
                    uid: user.uid,
                    type: type,
                    amount: amountVal,
                    description: descVal,
                    date: timestampDate,
                    createdAt: serverTimestamp(),
                });
            }

            if (isIncome) {
                setIncAmount("");
                setIncDesc("");
                setIncDate(new Date().toISOString().split("T")[0]);
            } else {
                setExpAmount("");
                setExpDesc("");
                setExpDate(new Date().toISOString().split("T")[0]);
            }
            setEditingId(null);
        } catch (error) {
            console.error("Error saving entry:", error);
            alert("Failed to save.");
        }
    };

    const handleEditClick = (entry) => {
        setEditingId(entry.id);
        const dateStr = new Date(entry.date.seconds * 1000)
            .toISOString()
            .split("T")[0];

        if (entry.type === "income") {
            setIncAmount(entry.amount);
            setIncDesc(entry.description);
            setIncDate(dateStr);
            setExpAmount("");
            setExpDesc("");

            setTimeout(() => {
                incomeRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 100);
        } else {
            setExpAmount(entry.amount);
            setExpDesc(entry.description);
            setExpDate(dateStr);
            setIncAmount("");
            setIncDesc("");

            setTimeout(() => {
                expenseRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 100);
        }
    };

    const handleDelete = async (id, description) => {
        if (window.confirm(`Are you sure you want to delete "${description}"?`)) {
            await deleteDoc(doc(db, "journal", id));
            if (editingId === id) setEditingId(null);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Unknown";
        return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
    };

    const dateInputClass =
        "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm outline-none transition appearance-none";

    const toggleCard = (cardName) => {
        setExpandedCard(expandedCard === cardName ? null : cardName);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-24">
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

            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8 transition-all duration-200 ease-out">
                <div
                    onClick={() => toggleCard("income")}
                    className={`bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm text-center flex flex-col justify-center cursor-pointer transition-all duration-200 ${expandedCard === "income"
                            ? "col-span-3 lg:col-span-1 bg-green-50 border-green-200 shadow-md py-6"
                            : "col-span-1 hover:shadow-md"
                        }`}
                >
                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                        Income (Rs)
                    </p>
                    <p
                        className={`text-green-600 font-bold transition-all duration-200 ${expandedCard === "income"
                                ? "text-2xl break-all"
                                : "text-sm md:text-lg truncate"
                            }`}
                    >
                        {totalIncome.toLocaleString()}
                    </p>
                    {expandedCard === "income" && (
                        <p className="text-[10px] text-green-400 mt-1 lg:hidden">
                            Tap to shrink
                        </p>
                    )}
                </div>

                <div
                    onClick={() => toggleCard("expense")}
                    className={`bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm text-center flex flex-col justify-center cursor-pointer transition-all duration-200 ${expandedCard === "expense"
                            ? "col-span-3 lg:col-span-1 bg-red-50 border-red-200 shadow-md py-6"
                            : "col-span-1 hover:shadow-md"
                        }`}
                >
                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                        Expense (Rs)
                    </p>
                    <p
                        className={`text-red-500 font-bold transition-all duration-200 ${expandedCard === "expense"
                                ? "text-2xl break-all"
                                : "text-sm md:text-lg truncate"
                            }`}
                    >
                        {totalExpense.toLocaleString()}
                    </p>
                    {expandedCard === "expense" && (
                        <p className="text-[10px] text-red-400 mt-1 lg:hidden">
                            Tap to shrink
                        </p>
                    )}
                </div>

                {/* BALANCE CARD */}
                <div
                    onClick={() => toggleCard("balance")}
                    className={`bg-blue-600 p-3 md:p-4 rounded-xl shadow-lg text-center text-white flex flex-col justify-center cursor-pointer transition-all duration-200 ${expandedCard === "balance"
                            ? "col-span-3 lg:col-span-1 shadow-xl py-6"
                            : "col-span-1 hover:shadow-xl"
                        }`}
                >
                    <p className="text-[10px] md:text-xs text-blue-200 uppercase font-bold tracking-wider mb-1">
                        Balance (Rs)
                    </p>
                    <p
                        className={`font-bold transition-all duration-200 ${expandedCard === "balance"
                                ? "text-2xl break-all"
                                : "text-sm md:text-lg truncate"
                            }`}
                    >
                        {balance.toLocaleString()}
                    </p>
                    {expandedCard === "balance" && (
                        <p className="text-[10px] text-blue-300 mt-1 lg:hidden">
                            Tap to shrink
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
                <div
                    ref={incomeRef}
                    className={`bg-white p-4 md:p-5 rounded-2xl shadow-sm border-t-4 border-green-500 transition-all duration-300 ${editingId && incAmount ? "ring-2 ring-green-500 ring-offset-2 scale-[1.02]" : "hover:shadow-md"}`}
                >
                    <div className="flex items-center justify-between mb-4 text-green-600">
                        <div className="flex items-center gap-2">
                            <FiArrowUpCircle size={20} />
                            <h2 className="font-bold text-gray-800 text-sm md:text-base">
                                {editingId && incAmount ? "Edit Income" : "Add Income"}
                            </h2>
                        </div>
                        {editingId && incAmount && (
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setIncAmount("");
                                    setIncDesc("");
                                }}
                                className="text-xs text-gray-400 hover:text-gray-600"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                    <div className="space-y-3">
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
                            text={editingId && incAmount ? "Update Income" : "Save Income"}
                            onClick={() => handleSaveEntry("income")}
                            className="bg-green-600 hover:bg-green-700 w-full mt-2 text-sm"
                        />
                    </div>
                </div>

                <div
                    ref={expenseRef}
                    className={`bg-white p-4 md:p-5 rounded-2xl shadow-sm border-t-4 border-red-500 transition-all duration-300 ${editingId && expAmount ? "ring-2 ring-red-500 ring-offset-2 scale-[1.02]" : "hover:shadow-md"}`}
                >
                    <div className="flex items-center justify-between mb-4 text-red-500">
                        <div className="flex items-center gap-2">
                            <FiArrowDownCircle size={20} />
                            <h2 className="font-bold text-gray-800 text-sm md:text-base">
                                {editingId && expAmount ? "Edit Expense" : "Add Expense"}
                            </h2>
                        </div>
                        {editingId && expAmount && (
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setExpAmount("");
                                    setExpDesc("");
                                }}
                                className="text-xs text-gray-400 hover:text-gray-600"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                    <div className="space-y-3">
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
                            text={editingId && expAmount ? "Update Expense" : "Save Expense"}
                            onClick={() => handleSaveEntry("expense")}
                            className="bg-red-500 hover:bg-red-600 w-full mt-2 text-sm"
                        />
                    </div>
                </div>
            </div>

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
                                    className={`bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-blue-200 transition ${editingId === e.id ? "bg-blue-50 border-blue-200" : ""}`}
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
                                    <div className="flex items-center gap-3 ml-2 shrink-0">
                                        <span
                                            className={`font-bold text-sm md:text-base whitespace-nowrap ${e.type === "income" ? "text-green-600" : "text-red-500"}`}
                                        >
                                            {e.type === "income" ? "+" : "-"}Rs.
                                            {e.amount.toLocaleString()}
                                        </span>

                                        <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                                            <button
                                                onClick={() => handleEditClick(e)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>

                                            <div className="w-px h-4 bg-gray-300 mx-1"></div>

                                            <button
                                                onClick={() => handleDelete(e.id, e.description)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-white rounded-md transition"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
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
