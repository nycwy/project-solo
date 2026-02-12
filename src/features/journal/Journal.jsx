import React, { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    writeBatch,
} from "firebase/firestore";
import Button from "../../components/Button";
import Input from "../../components/Input";
import {
    FiArrowUpCircle,
    FiArrowDownCircle,
    FiTrash2,
    FiActivity,
    FiPlus,
    FiX,
    FiEdit2,
    FiSave,
    FiAlertCircle,
    FiArrowRight,
    FiArrowLeft,
    FiCalendar,
} from "react-icons/fi";

const Journal = () => {
    const { user } = useContext(AuthContext);

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState("income");
    const [editingId, setEditingId] = useState(null);

    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [drafts, setDrafts] = useState([]);

    const [expandedCard, setExpandedCard] = useState(null);
    const [isIncomeTruncated, setIsIncomeTruncated] = useState(false);
    const [isExpenseTruncated, setIsExpenseTruncated] = useState(false);

    const incomeTextRef = useRef(null);
    const expenseTextRef = useRef(null);

    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, "journal"), where("uid", "==", user.uid));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                data.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

                setEntries(data);
                setLoading(false);
            },
            (error) => {
                console.error("Firestore Error:", error);
                setLoading(false);
            },
        );

        return () => unsubscribe();
    }, [user]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthEntries = entries.filter((entry) => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date.seconds * 1000);
        return (
            entryDate.getMonth() === currentMonth &&
            entryDate.getFullYear() === currentYear
        );
    });

    const currentMonthIncome = currentMonthEntries
        .filter((e) => e.type === "income")
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const currentMonthExpense = currentMonthEntries
        .filter((e) => e.type === "expense")
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const currentMonthBalance = currentMonthIncome - currentMonthExpense;

    const getGroupedEntries = () => {
        const groups = {};

        entries.forEach((entry) => {
            if (!entry.date) return;
            const dateObj = new Date(entry.date.seconds * 1000);
            const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;

            if (!groups[key]) {
                groups[key] = {
                    dateObj: dateObj,
                    monthIncome: 0,
                    monthExpense: 0,
                    items: [],
                };
            }

            groups[key].items.push(entry);
            if (entry.type === "income")
                groups[key].monthIncome += Number(entry.amount);
            if (entry.type === "expense")
                groups[key].monthExpense += Number(entry.amount);
        });

        return Object.values(groups).sort((a, b) => b.dateObj - a.dateObj);
    };

    const groupedEntries = getGroupedEntries();

    useEffect(() => {
        const resetTimer = setTimeout(() => {
            setIsIncomeTruncated(false);
            setIsExpenseTruncated(false);
        }, 0);

        const checkOverflow = () => {
            if (expandedCard) return;

            if (incomeTextRef.current) {
                const { scrollWidth, clientWidth } = incomeTextRef.current;
                setIsIncomeTruncated(scrollWidth > clientWidth + 1);
            }

            if (expenseTextRef.current) {
                const { scrollWidth, clientWidth } = expenseTextRef.current;
                setIsExpenseTruncated(scrollWidth > clientWidth + 1);
            }
        };

        const checkTimer = setTimeout(checkOverflow, 600);

        window.addEventListener("resize", checkOverflow);
        return () => {
            clearTimeout(resetTimer);
            clearTimeout(checkTimer);
            window.removeEventListener("resize", checkOverflow);
        };
    }, [currentMonthIncome, currentMonthExpense, expandedCard]);

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = (cardType) => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (cardType === "income") {
            if (isRightSwipe && !expandedCard) setExpandedCard("income");
            if (isLeftSwipe && expandedCard === "income") setExpandedCard(null);
        }
        if (cardType === "expense") {
            if (isLeftSwipe && !expandedCard) setExpandedCard("expense");
            if (isRightSwipe && expandedCard === "expense") setExpandedCard(null);
        }
    };

    const handleCardClick = (type) => {
        if (
            touchStart &&
            touchEnd &&
            Math.abs(touchStart - touchEnd) > minSwipeDistance
        )
            return;
        openAddModal(type);
    };

    const resetForm = () => {
        setAmount("");
        setDesc("");
        setDate(new Date().toISOString().split("T")[0]);
    };

    const openAddModal = (type) => {
        setModalType(type);
        setEditingId(null);
        setDrafts([]);
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (entry) => {
        setModalType(entry.type);
        setEditingId(entry.id);
        setDrafts([]);
        setAmount(entry.amount);
        setDesc(entry.description);
        setDate(new Date(entry.date.seconds * 1000).toISOString().split("T")[0]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        resetForm();
    };

    const addToDraft = () => {
        if (!amount || parseFloat(amount) <= 0)
            return alert("Please enter a valid amount.");
        if (!desc.trim()) return alert("Please enter a description.");

        const newDraft = {
            id: Date.now(),
            amount: parseFloat(amount),
            description: desc,
            date: date,
            type: modalType,
        };
        setDrafts((prev) => [newDraft, ...prev]);
        resetForm();
        setDate(newDraft.date);
    };

    const removeFromDraft = (tempId) =>
        setDrafts((prev) => prev.filter((d) => d.id !== tempId));

    const handleSave = async () => {
        setLoading(true);
        try {
            if (editingId) {
                const entryDate = new Date(date);
                entryDate.setHours(12, 0, 0, 0);
                await updateDoc(doc(db, "journal", editingId), {
                    amount: parseFloat(amount),
                    description: desc,
                    date: Timestamp.fromDate(entryDate),
                });
            } else {
                const finalDrafts = [...drafts];
                if (amount && desc) {
                    finalDrafts.push({
                        amount: parseFloat(amount),
                        description: desc,
                        date: date,
                        type: modalType,
                    });
                }
                if (finalDrafts.length === 0) {
                    setLoading(false);
                    return alert("Please add at least one entry.");
                }
                const batch = writeBatch(db);
                finalDrafts.forEach((draft) => {
                    const newDocRef = doc(collection(db, "journal"));
                    const entryDate = new Date(draft.date);
                    entryDate.setHours(12, 0, 0, 0);
                    batch.set(newDocRef, {
                        uid: user.uid,
                        type: draft.type,
                        amount: draft.amount,
                        description: draft.description,
                        date: Timestamp.fromDate(entryDate),
                        createdAt: serverTimestamp(),
                    });
                });
                await batch.commit();
            }
            closeModal();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save entries. Please try again.");
        }
        setLoading(false);
    };

    const handleDelete = async (id, description) => {
        if (window.confirm(`Are you sure you want to delete "${description}"?`)) {
            try {
                await deleteDoc(doc(db, "journal", id));
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Could not delete entry.");
            }
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    const getMonthName = (dateObj) => {
        return dateObj.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-blue-200 shadow-lg">
                            <FiActivity size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">
                                Finance Journal
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">
                                Current Month Net: Rs. {currentMonthBalance.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className={`
            flex md:grid md:grid-cols-2 
            ${expandedCard ? "gap-0" : "gap-3"} md:gap-6 
            mb-8 w-full h-28 md:h-auto transition-all duration-300
        `}
                >
                    <div
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={() => onTouchEnd("income")}
                        onClick={() => handleCardClick("income")}
                        className={`
                bg-white rounded-2xl border-b-4 border-green-500 shadow-sm cursor-pointer 
                md:hover:shadow-md md:hover:-translate-y-1 
                transition-all duration-500 ease-in-out group relative flex flex-col justify-between overflow-hidden
                ${expandedCard === "expense"
                                ? "w-0 p-0 border-none opacity-0 m-0"
                                : expandedCard === "income"
                                    ? "w-full p-5"
                                    : "w-1/2 p-4"
                            }
                md:w-auto md:p-5 md:opacity-100
            `}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                                Income {`(${new Date().toLocaleString('default', { month: 'short' })})`}
                            </p>
                            <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center md:group-hover:bg-green-600 md:group-hover:text-white transition-colors shrink-0">
                                <FiPlus size={14} />
                            </div>
                        </div>

                        <div className="flex-1 flex items-center min-w-0">
                            <p
                                ref={incomeTextRef}
                                className={`font-bold text-gray-800 whitespace-nowrap no-scrollbar ${expandedCard === "income"
                                    ? "text-3xl md:text-2xl overflow-x-auto"
                                    : "text-lg md:text-2xl truncate"
                                    }`}
                            >
                                <span className="text-green-500 text-lg align-top mr-0.5">
                                    Rs.
                                </span>
                                {currentMonthIncome.toLocaleString()}
                            </p>
                        </div>

                        {isIncomeTruncated && !expandedCard && (
                            <div className="absolute bottom-2 left-4 md:hidden animate-pulse">
                                <p className="text-[8px] text-gray-400 flex items-center gap-1 font-medium">
                                    Swipe <FiArrowRight size={10} /> to expand
                                </p>
                            </div>
                        )}

                        {expandedCard === "income" && (
                            <div className="absolute bottom-2 right-4 md:hidden animate-pulse">
                                <p className="text-[8px] text-gray-400 flex items-center gap-1 font-medium">
                                    Swipe <FiArrowLeft size={10} /> to collapse
                                </p>
                            </div>
                        )}
                    </div>

                    <div
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={() => onTouchEnd("expense")}
                        onClick={() => handleCardClick("expense")}
                        className={`
                bg-white rounded-2xl border-b-4 border-red-500 shadow-sm cursor-pointer 
                md:hover:shadow-md md:hover:-translate-y-1 
                transition-all duration-500 ease-in-out group relative flex flex-col justify-between overflow-hidden
                ${expandedCard === "income"
                                ? "w-0 p-0 border-none opacity-0 m-0"
                                : expandedCard === "expense"
                                    ? "w-full p-5"
                                    : "w-1/2 p-4"
                            }
                md:w-auto md:p-5 md:opacity-100
            `}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                                Expense {`(${new Date().toLocaleString('default', { month: 'short' })})`}
                            </p>
                            <div className="w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center md:group-hover:bg-red-500 md:group-hover:text-white transition-colors shrink-0">
                                <FiPlus size={14} />
                            </div>
                        </div>

                        <div className="flex-1 flex items-center min-w-0">
                            <p
                                ref={expenseTextRef}
                                className={`font-bold text-gray-800 whitespace-nowrap no-scrollbar ${expandedCard === "expense"
                                    ? "text-3xl md:text-2xl overflow-x-auto"
                                    : "text-lg md:text-2xl truncate"
                                    }`}
                            >
                                <span className="text-red-500 text-lg align-top mr-0.5">
                                    Rs.
                                </span>
                                {currentMonthExpense.toLocaleString()}
                            </p>
                        </div>

                        {isExpenseTruncated && !expandedCard && (
                            <div className="absolute bottom-2 right-4 md:hidden animate-pulse">
                                <p className="text-[8px] text-gray-400 flex items-center gap-1 font-medium">
                                    <FiArrowLeft size={10} /> Swipe to expand
                                </p>
                            </div>
                        )}

                        {expandedCard === "expense" && (
                            <div className="absolute bottom-2 left-4 md:hidden animate-pulse">
                                <p className="text-[8px] text-gray-400 flex items-center gap-1 font-medium">
                                    Swipe <FiArrowRight size={10} /> to collapse
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-4 ml-1">
                        Recent Transactions
                    </h3>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400 text-sm animate-pulse">
                            Loading data...
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                            <FiAlertCircle className="mx-auto text-gray-300 mb-2" size={24} />
                            <p className="text-gray-500 text-sm font-medium">
                                No transactions found
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Tap the cards above to add one
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupedEntries.map((group, groupIndex) => (
                                <div key={groupIndex}>
                                    <div className="flex items-end justify-between bg-gray-100 rounded-xl p-3 mb-3 border border-gray-200">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <FiCalendar size={16} className="mb-0.5" />
                                            <h4 className="font-bold text-sm text-gray-700">
                                                {getMonthName(group.dateObj)}
                                            </h4>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                                                Net
                                            </div>
                                            <div
                                                className={`text-xs font-bold ${group.monthIncome - group.monthExpense >= 0
                                                    ? "text-green-600"
                                                    : "text-red-500"
                                                    }`}
                                            >
                                                Rs.{" "}
                                                {(
                                                    group.monthIncome - group.monthExpense
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {group.items.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${entry.type === "income"
                                                            ? "bg-green-50 text-green-600"
                                                            : "bg-red-50 text-red-500"
                                                            }`}
                                                    >
                                                        {entry.type === "income" ? (
                                                            <FiArrowUpCircle size={20} />
                                                        ) : (
                                                            <FiArrowDownCircle size={20} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-800 truncate pr-2">
                                                            {entry.description}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-medium">
                                                            {formatDate(entry.date)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span
                                                        className={`font-bold text-sm ${entry.type === "income"
                                                            ? "text-green-600"
                                                            : "text-red-500"
                                                            }`}
                                                    >
                                                        Rs. {Number(entry.amount).toLocaleString()}
                                                    </span>

                                                    <div className="flex gap-1 pl-2 border-l border-gray-100 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditModal(entry)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        >
                                                            <FiEdit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(entry.id, entry.description)
                                                            }
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        >
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                            onClick={closeModal}
                        ></div>

                        <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] md:max-h-[80vh] animate-slide-up">
                            <div
                                className={`px-6 py-4 flex justify-between items-center border-b ${modalType === "income"
                                    ? "bg-green-50 border-green-100"
                                    : "bg-red-50 border-red-100"
                                    } rounded-t-3xl`}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`p-1.5 rounded-lg ${modalType === "income"
                                            ? "bg-green-200 text-green-700"
                                            : "bg-red-200 text-red-700"
                                            }`}
                                    >
                                        {modalType === "income" ? (
                                            <FiArrowUpCircle />
                                        ) : (
                                            <FiArrowDownCircle />
                                        )}
                                    </div>
                                    <h2
                                        className={`font-bold ${modalType === "income" ? "text-green-800" : "text-red-800"
                                            }`}
                                    >
                                        {editingId
                                            ? "Edit Entry"
                                            : `Add ${modalType === "income" ? "Income" : "Expense"}`}
                                    </h2>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-gray-500"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">
                                                Amount
                                            </label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={amount}
                                                setValue={setAmount}
                                                className="font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-gray-700"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">
                                            Description
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="e.g. Freelance, Groceries"
                                            value={desc}
                                            setValue={setDesc}
                                        />
                                    </div>

                                    {!editingId && (
                                        <button
                                            onClick={addToDraft}
                                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-dashed transition-all active:scale-95 ${modalType === "income"
                                                ? "border-green-300 text-green-600 hover:bg-green-50"
                                                : "border-red-300 text-red-500 hover:bg-red-50"
                                                }`}
                                        >
                                            <FiPlus /> Add Another to List
                                        </button>
                                    )}

                                    {drafts.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    To be added ({drafts.length})
                                                </h3>
                                                <button
                                                    onClick={() => setDrafts([])}
                                                    className="text-[10px] text-red-400 hover:underline"
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                                {drafts.map((d) => (
                                                    <div
                                                        key={d.id}
                                                        className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-sm"
                                                    >
                                                        <span className="font-medium text-gray-700 truncate max-w-36">
                                                            {d.description}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className={`font-mono font-bold ${d.type === "income"
                                                                    ? "text-green-600"
                                                                    : "text-red-500"
                                                                    }`}
                                                            >
                                                                {d.amount}
                                                            </span>
                                                            <button
                                                                onClick={() => removeFromDraft(d.id)}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <FiX size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 border-t bg-gray-50 md:rounded-b-3xl safe-area-bottom">
                                <Button
                                    text={
                                        loading
                                            ? "Saving..."
                                            : editingId
                                                ? "Update Entry"
                                                : `Save ${drafts.length + (amount && desc ? 1 : 0)} Items`
                                    }
                                    onClick={handleSave}
                                    disabled={loading}
                                    className={`w-full shadow-lg flex justify-center items-center gap-2 ${modalType === "income"
                                        ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                                        : "bg-red-500 hover:bg-red-600 shadow-red-200"
                                        }`}
                                >
                                    <FiSave />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Journal;
