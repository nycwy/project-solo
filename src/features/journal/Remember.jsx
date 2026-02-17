import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
    writeBatch,
} from "firebase/firestore";
import Button from "../../components/Button";
import Input from "../../components/Input";
import {
    FiArrowLeft,
    FiPlus,
    FiCheck,
    FiTrash2,
    FiShoppingCart,
    FiX,
    FiShoppingBag,
} from "react-icons/fi";

const Remember = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [itemName, setItemName] = useState("");
    const [estAmount, setEstAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const [purchasingItem, setPurchasingItem] = useState(null);
    const [actualPrice, setActualPrice] = useState("");

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, "shopping_list"),
            where("uid", "==", user.uid),
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
            setItems(data);
        });

        return () => unsubscribe();
    }, [user]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!itemName.trim()) return alert("What do you need to buy?");

        setLoading(true);
        try {
            await addDoc(collection(db, "shopping_list"), {
                uid: user.uid,
                item: itemName,
                estimatedAmount: parseFloat(estAmount) || 0,
                createdAt: serverTimestamp(),
            });
            setItemName("");
            setEstAmount("");
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Remove this item from list?")) {
            await deleteDoc(doc(db, "shopping_list", id));
        }
    };

    const openPurchaseModal = (item) => {
        setPurchasingItem(item);
        setActualPrice(item.estimatedAmount.toString());
    };

    const handleConfirmPurchase = async () => {
        if (!purchasingItem) return;
        setLoading(true);

        try {
            const batch = writeBatch(db);

            const journalRef = doc(collection(db, "journal"));
            const today = new Date();
            today.setHours(12, 0, 0, 0);

            batch.set(journalRef, {
                uid: user.uid,
                type: "expense",
                amount: parseFloat(actualPrice) || 0,
                description: purchasingItem.item,
                date: Timestamp.fromDate(today),
                createdAt: serverTimestamp(),
                source: "remember_list",
            });

            const itemRef = doc(db, "shopping_list", purchasingItem.id);
            batch.delete(itemRef);

            await batch.commit();
            setPurchasingItem(null);
        } catch (error) {
            console.error("Error moving item:", error);
            alert("Failed to update.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-24">
            <div className="max-w-md mx-auto">
                <div className="flex items-center gap-3 md:gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                    >
                        <FiArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Shopping List</h1>
                        <p className="text-xs text-gray-500">Add items to be Purchased</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-lg shadow-blue-50 border border-gray-100 mb-8">
                    <form onSubmit={handleAddItem} className="flex gap-2">
                        <div className="flex-1 space-y-2">
                            <input
                                type="text"
                                placeholder="Item name (e.g. Milk, Sugar ...)"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                className="w-full bg-gray-50 px-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 transition-all text-gray-700"
                            />
                            <div className="relative">
                                <span className="absolute left-4 top-3 text-gray-400 font-bold text-xs">
                                    Rs.
                                </span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={estAmount}
                                    onChange={(e) => setEstAmount(e.target.value)}
                                    className="w-full bg-gray-50 pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 transition-all font-mono text-gray-700"
                                />
                            </div>
                        </div>
                        <button
                            disabled={loading}
                            className="w-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 active:scale-95 transition-all"
                        >
                            {loading ? (
                                <span className="animate-spin text-lg">C</span>
                            ) : (
                                <FiPlus size={24} />
                            )}
                        </button>
                    </form>
                </div>

                <div>
                    <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-4 ml-1">
                        To Buy ({items.length})
                    </h3>

                    <div className="space-y-3">
                        {items.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                <FiShoppingCart
                                    className="mx-auto text-gray-300 mb-2"
                                    size={24}
                                />
                                <p className="text-gray-400 text-sm">List is empty</p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-blue-200 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                                            <FiShoppingBag size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">
                                                {item.item}
                                            </p>
                                            {item.estimatedAmount > 0 && (
                                                <p className="text-xs text-gray-400 font-mono mt-0.5">
                                                    Est: Rs. {item.estimatedAmount}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openPurchaseModal(item)}
                                            className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                            title="Bought it!"
                                        >
                                            <FiCheck size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="w-9 h-9 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {purchasingItem && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setPurchasingItem(null)}
                        ></div>
                        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-6 animate-slide-up">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">
                                        Bought it?
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Confirm price for{" "}
                                        <span className="font-bold text-blue-600">
                                            {purchasingItem.item}
                                        </span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPurchasingItem(null)}
                                    className="p-1 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition"
                                >
                                    <FiX />
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                    Actual Price Paid
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-gray-400 font-bold">
                                        Rs.
                                    </span>
                                    <Input
                                        type="number"
                                        value={actualPrice}
                                        setValue={setActualPrice}
                                        className="pl-12 text-lg font-bold font-mono text-gray-700 bg-gray-50 border-gray-200 focus:bg-white"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <Button
                                text={loading ? "Saving..." : "Confirm & Add to Expense"}
                                onClick={handleConfirmPurchase}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 shadow-green-200 w-full py-4"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Remember;
