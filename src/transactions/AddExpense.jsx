import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { db } from "../services/firebase";
import {
    collection,
    serverTimestamp,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
} from "firebase/firestore";
import Button from "../components/Button";
import Input from "../components/Input";
import {
    FiArrowLeft,
    FiUsers,
    FiCheck,
    FiChevronDown,
    FiChevronUp,
} from "react-icons/fi";

const AddExpense = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { id } = useParams();

    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [participants, setParticipants] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showFriendSelector, setShowFriendSelector] = useState(false);
    const [existingBatchId, setExistingBatchId] = useState(null);

    // 1. Fetch Friends & Set Initial Participant (Me)
    useEffect(() => {
        const fetchFriends = async () => {
            if (user?.uid) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFriends(docSnap.data().friendsList || []);
                }
                if (!id) setParticipants([user.uid]);
            }
        };
        fetchFriends();
    }, [user, id]);

    // 2. Fetch Existing Transaction (If Editing)
    useEffect(() => {
        const fetchTransaction = async () => {
            if (!id) return;
            setIsEditing(true);
            setLoading(true);

            try {
                const mainDoc = await getDoc(doc(db, "transactions", id));
                if (!mainDoc.exists()) {
                    alert("Expense not found");
                    navigate("/");
                    return;
                }

                const data = mainDoc.data();

                if (data.payerId !== user.uid) {
                    alert("You can only edit expenses you created.");
                    navigate("/");
                    return;
                }

                setDescription(data.description);
                const totalAmount = data.originalAmount || data.amount;
                setAmount(totalAmount.toString());

                if (data.batchId) {
                    setExistingBatchId(data.batchId);
                    const q = query(
                        collection(db, "transactions"),
                        where("batchId", "==", data.batchId),
                    );
                    const batchSnap = await getDocs(q);
                    const foundParticipants = new Set([user.uid]);

                    batchSnap.forEach((doc) => {
                        const t = doc.data();
                        if (t.debtorId !== "SELF") foundParticipants.add(t.debtorId);
                    });
                    setParticipants(Array.from(foundParticipants));
                } else {
                    if (data.debtorId !== "SELF") {
                        setParticipants([user.uid, data.debtorId]);
                    } else {
                        setParticipants([user.uid]);
                    }
                }
            } catch (error) {
                console.error("Error fetching expense details:", error);
            }
            setLoading(false);
        };

        if (user) fetchTransaction();
    }, [id, user, navigate]);

    const toggleParticipant = (friendId) => {
        setParticipants((prev) => {
            if (prev.includes(friendId)) {
                return prev.filter((id) => id !== friendId);
            } else {
                return [...prev, friendId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const numericAmount = parseFloat(amount);
            if (isNaN(numericAmount) || numericAmount <= 0)
                throw new Error("Invalid amount");
            if (participants.length === 0)
                throw new Error("Select at least one person.");

            const splitAmount = numericAmount / participants.length;
            const newBatchId = existingBatchId || Date.now().toString();

            const batch = writeBatch(db);

            // DELETE OLD TRANSACTIONS IF EDITING
            if (isEditing) {
                if (existingBatchId) {
                    const q = query(
                        collection(db, "transactions"),
                        where("batchId", "==", existingBatchId),
                    );
                    const oldDocs = await getDocs(q);
                    oldDocs.forEach((d) => batch.delete(d.ref));
                } else {
                    batch.delete(doc(db, "transactions", id));
                }
            }

            // CREATE NEW TRANSACTIONS
            if (participants.length === 1 && participants.includes(user.uid)) {
                const newRef = doc(collection(db, "transactions"));
                batch.set(newRef, {
                    description,
                    originalAmount: numericAmount,
                    amount: numericAmount,
                    payerId: user.uid,
                    debtorId: "SELF",
                    date: serverTimestamp(),
                    status: "confirmed",
                    splitType: "SELF",
                    batchId: newBatchId,
                    settleStatus: null,
                });
            } else {
                participants.forEach((pId) => {
                    if (pId === user.uid) return;

                    const newRef = doc(collection(db, "transactions"));
                    batch.set(newRef, {
                        description,
                        originalAmount: numericAmount,
                        amount: parseFloat(splitAmount.toFixed(2)),
                        payerId: user.uid,
                        debtorId: pId,
                        date: serverTimestamp(),
                        status: "pending",
                        splitType: "EQUAL",
                        batchId: newBatchId,
                        settleStatus: null,
                    });
                });
            }

            await batch.commit();
            navigate("/");
        } catch (error) {
            console.error("Error saving expense:", error);
            alert("Failed to save. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-white p-6 md:p-8 border-b border-gray-50 flex items-center gap-4">
                    <button
                        onClick={() => navigate("/")}
                        className="p-2 -ml-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                    >
                        <FiArrowLeft size={22} />
                    </button>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                            {isEditing ? "Edit Expense" : "New Expense"}
                        </h2>
                        <p className="text-xs text-gray-400">Enter details below</p>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Description Field */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                For what?
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Saturday Dinner, Uber..."
                                value={description}
                                setValue={setDescription}
                                className="text-sm md:text-base bg-gray-50 border-gray-200 focus:bg-white"
                            />
                        </div>

                        {/* Amount Field */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Total Bill
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-gray-400 font-bold">
                                    Rs.
                                </span>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    setValue={setAmount}
                                    className="pl-12 text-lg font-bold text-gray-800 bg-gray-50 border-gray-200 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* Friend Selector Dropdown */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Split with
                            </label>

                            <button
                                type="button"
                                onClick={() => setShowFriendSelector(!showFriendSelector)}
                                className={`w-full flex justify-between items-center p-4 rounded-xl border transition-all duration-200 ${showFriendSelector
                                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-white hover:shadow-sm"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <FiUsers
                                            className={
                                                showFriendSelector ? "text-blue-500" : "text-gray-400"
                                            }
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold">
                                            {participants.length === 1
                                                ? "Just Me"
                                                : `${participants.length} People`}
                                        </p>
                                        <p className="text-[10px] opacity-70">
                                            {participants.length === 1
                                                ? "Personal Expense"
                                                : "Split Equally"}
                                        </p>
                                    </div>
                                </div>
                                {showFriendSelector ? <FiChevronUp /> : <FiChevronDown />}
                            </button>

                            {/* Dropdown List */}
                            {showFriendSelector && (
                                <div className="mt-3 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up z-10 relative">
                                    <div className="p-2 max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                                        {/* Myself (Always Checked) */}
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl opacity-60">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                                                    YOU
                                                </div>
                                                <span className="font-bold text-sm text-gray-700">
                                                    You (Payer)
                                                </span>
                                            </div>
                                            <FiCheck className="text-blue-600" />
                                        </div>

                                        {/* Friend List */}
                                        {friends.length > 0 ? (
                                            friends.map((friend) => {
                                                const isSelected = participants.includes(friend.uid);
                                                return (
                                                    <div
                                                        key={friend.uid}
                                                        onClick={() => toggleParticipant(friend.uid)}
                                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected
                                                                ? "bg-blue-50 border border-blue-100"
                                                                : "hover:bg-gray-50 border border-transparent"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected
                                                                        ? "bg-blue-600 text-white"
                                                                        : "bg-gray-200 text-gray-500"
                                                                    }`}
                                                            >
                                                                {friend.username[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span
                                                                    className={`text-sm font-bold ${isSelected ? "text-blue-800" : "text-gray-700"}`}
                                                                >
                                                                    {friend.username}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">
                                                                    {friend.email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {isSelected && (
                                                            <FiCheck className="text-blue-600" />
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="p-4 text-xs text-gray-400 text-center">
                                                No friends added yet.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Breakdown Calculation */}
                        {amount && participants.length > 0 && (
                            <div className="bg-linear-to-r from-gray-50 to-gray-100 p-5 rounded-2xl border border-gray-200/60">
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3 text-center">
                                    Summary
                                </p>
                                <div className="flex justify-between items-center text-sm md:text-base">
                                    <div className="text-center w-1/2 border-r border-gray-300 pr-4">
                                        <p className="text-xs text-gray-500 mb-1">Per Person</p>
                                        <p className="font-bold text-gray-800 text-lg">
                                            रु {(amount / participants.length).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="text-center w-1/2 pl-4">
                                        <p className="text-xs text-gray-500 mb-1">You receive</p>
                                        <p className="font-bold text-green-600 text-lg">
                                            + रु {(amount - amount / participants.length).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            text={
                                loading
                                    ? "Processing..."
                                    : isEditing
                                        ? "Update Expense"
                                        : "Save Expense"
                            }
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transform active:scale-95 transition-all"
                        />
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddExpense;
