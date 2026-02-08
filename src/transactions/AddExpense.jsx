import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../services/firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
} from "firebase/firestore";
import Button from "../components/Button";
import Input from "../components/Input";

const AddExpense = () => {
    const navigate = useNavigate();

    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [selectedFriend, setSelectedFriend] = useState("");
    const [splitType, setSplitType] = useState("EQUAL");

    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchFriends = async () => {
            if (!auth.currentUser) return;
            
            const userRef = doc(db, "users", auth.currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                setFriends(userSnap.data().friendsList || []);
            }
            setLoading(false);
        };
        fetchFriends();
    }, []);

    const handleSubmit = async () => {
        if (!amount || !description || !selectedFriend) {
            alert("Please fill in all fields (don't forget to pick a friend!)");
            return;
        }

        setSubmitting(true);

        try {
            const totalAmount = parseFloat(amount);
            let amountOwed = totalAmount;

            if (splitType === "EQUAL") {
                amountOwed = totalAmount / 2;
            }

            await addDoc(collection(db, "transactions"), {
                payerId: auth.currentUser.uid,
                debtorId: selectedFriend,
                amount: amountOwed,
                originalAmount: totalAmount,
                description: description,
                status: "pending",
                splitType: splitType,
                date: serverTimestamp(),
            });

            navigate("/");
        } catch (error) {
            console.error("Error adding expense: ", error);
            alert("Failed to save. Check console.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading)
        return <div className="p-10 text-center">Loading friends...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => navigate("/")}
                        className="text-gray-400 hover:text-gray-600 font-medium"
                    >
                        ← Back
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">Split Bill</h2>
                    <div className="w-8"></div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            What was it for?
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g. Pizza, Uber, Rent"
                            value={description}
                            setValue={setDescription}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Split with whom?
                        </label>
                        {friends.length > 0 ? (
                            <select
                                value={selectedFriend}
                                onChange={(e) => setSelectedFriend(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a friend...</option>
                                {friends.map((friend) => (
                                    <option key={friend.uid} value={friend.uid}>
                                        {friend.username} ({friend.email})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                <p className="text-yellow-700 text-sm mb-2">
                                    You haven't added any friends yet!
                                </p>
                                <button
                                    onClick={() => navigate("/add-friend")}
                                    className="text-blue-600 font-bold text-sm underline"
                                >
                                    Add Friend First
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Bill Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-gray-500 font-bold">
                                $
                            </span>
                            <input
                                type="number"
                                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${splitType === "EQUAL" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
                            onClick={() => setSplitType("EQUAL")}
                        >
                            Split Equally (50%)
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${splitType === "FULL" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
                            onClick={() => setSplitType("FULL")}
                        >
                            Full Amount (Loan)
                        </button>
                    </div>

                    {amount && selectedFriend && (
                        <div className="text-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                            {splitType === "EQUAL"
                                ? `You paid $${amount}. Your friend will owe you $${(amount / 2).toFixed(2)}.`
                                : `You loaned $${amount}. Your friend will owe you $${amount}.`}
                        </div>
                    )}

                    <Button
                        text={submitting ? "Sending Request..." : "Send Request"}
                        onClick={handleSubmit}
                        disabled={submitting || friends.length === 0}
                        className="w-full py-4 mt-4"
                    />
                </div>
            </div>
        </div>
    );
};

export default AddExpense;
