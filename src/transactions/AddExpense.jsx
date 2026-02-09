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

    useEffect(() => {
        const fetchFriends = async () => {
            if (user?.uid) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFriends(docSnap.data().friendsList || []);
                }
                setParticipants([user.uid]);
            }
        };
        fetchFriends();
    }, [user]);

    useEffect(() => {
        const fetchTransaction = async () => {
            if (!id) return;
            setIsEditing(true);
            setLoading(true);

            try {
                const mainDoc = await getDoc(doc(db, "transactions", id));
                if (!mainDoc.exists()) {
                    alert("Expense not found");
                    navigate("/dashboard");
                    return;
                }

                const data = mainDoc.data();

                if (data.payerId !== user.uid) {
                    alert("You can only edit expenses you created.");
                    navigate("/dashboard");
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
                        setParticipants([user.uid]); // Personal
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

            if (participants.length === 1 && participants.includes(user.uid)) {
                const newRef = doc(collection(db, "transactions")); // Auto ID
                batch.set(newRef, {
                    description,
                    originalAmount: numericAmount,
                    amount: numericAmount,
                    payerId: user.uid,
                    debtorId: "SELF",
                    date: serverTimestamp(),
                    status: "completed",
                    splitType: "SELF",
                    batchId: newBatchId,
                });
            }
            else {
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
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => navigate("/")}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ← Back
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">
                        {isEditing ? "Edit Expense" : "Add Expense"}
                    </h2>
                    <div className="w-6"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Description
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g. Pizza Party"
                            value={description}
                            setValue={setDescription}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Total Bill Amount (रु)
                        </label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            setValue={setAmount}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Split with...
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowFriendSelector(!showFriendSelector)}
                            className="w-full flex justify-between items-center bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 font-semibold hover:bg-blue-100 transition"
                        >
                            <span>
                                {participants.length === 1
                                    ? "Just Me (Personal)"
                                    : `Me + ${participants.length - 1} others`}
                            </span>
                            <span>{showFriendSelector ? "▲" : "▼"}</span>
                        </button>

                        {showFriendSelector && (
                            <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-fade-in-down">
                                <div className="p-2 max-h-48 overflow-y-auto space-y-1">
                                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg opacity-70 cursor-not-allowed">
                                        <input
                                            type="checkbox"
                                            checked
                                            disabled
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                        <span className="font-medium text-gray-700">
                                            You (Payer)
                                        </span>
                                    </div>

                                    {friends.length > 0 ? (
                                        friends.map((friend) => (
                                            <label
                                                key={friend.uid}
                                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={participants.includes(friend.uid)}
                                                    onChange={() => toggleParticipant(friend.uid)}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-800">
                                                        {friend.username}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {friend.email}
                                                    </span>
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="p-2 text-xs text-gray-400 text-center">
                                            No friends found.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {amount && (
                        <div className="bg-gray-100 p-4 rounded-xl text-center">
                            <p className="text-gray-500 text-xs uppercase font-bold mb-1">
                                The Split
                            </p>
                            <div className="flex justify-center items-center gap-4 text-sm">
                                <div>
                                    <span className="block font-bold text-gray-800">
                                        रु {(amount / participants.length).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-gray-500">per person</span>
                                </div>
                                <div className="text-gray-300">|</div>
                                <div>
                                    <span className="block font-bold text-green-600">
                                        {`You get back रु ${(amount - amount / participants.length).toFixed(2)}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button
                        text={
                            loading
                                ? "Saving..."
                                : isEditing
                                    ? "Update Expense"
                                    : "Save Expense"
                        }
                        disabled={loading}
                    />
                </form>
            </div>
        </div>
    );
};

export default AddExpense;
