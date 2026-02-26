import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import {
    FiPlus,
    FiCheck,
    FiTrash2,
    FiShoppingCart,
    FiShoppingBag,
} from 'react-icons/fi';

import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import SwipeableCard from '../../components/SwipeableCard';
import useAlert from '../../hooks/useAlert';

const Remember = () => {
    const { user } = useContext(AuthContext);
    const { showAlert, showConfirm } = useAlert();
    const [items, setItems] = useState([]);
    const [itemName, setItemName] = useState('');
    const [estAmount, setEstAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const [purchasingItem, setPurchasingItem] = useState(null);
    const [actualPrice, setActualPrice] = useState('');

    const [editingItem, setEditingItem] = useState(null);
    const [editItemName, setEditItemName] = useState('');
    const [editEstAmount, setEditEstAmount] = useState('');

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'shopping_list'),
            where('uid', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
            data.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now());
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now());
                return timeB - timeA;
            });
            setItems(data);
        });
        return () => unsub();
    }, [user]);

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!itemName.trim()) return showAlert({ title: "Incomplete", message: "What do you need to buy?", type: "warning" });

        setLoading(true);
        try {
            // Initiate the add but don't await (Optimistic)
            addDoc(collection(db, 'shopping_list'), {
                uid: user.uid,
                item: itemName,
                estimatedAmount: parseFloat(estAmount) || 0,
                createdAt: serverTimestamp(),
            }).catch(err => {
                console.error("Background sync error", err);
            });

            // Reset UI immediately
            setLoading(false);
            setItemName('');
            setEstAmount('');
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Remove Item",
            message: "Remove this item from your shopping list?",
            confirmText: "Remove",
            onConfirm: () => deleteDoc(doc(db, 'shopping_list', id))
        });
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setEditItemName(item.item);
        setEditEstAmount(item.estimatedAmount?.toString() || '');
    };

    const handleEditSave = (e) => {
        e.preventDefault();
        if (!editItemName.trim()) return showAlert({ title: "Item Required", message: "Item name cannot be empty", type: "warning" });

        setLoading(true);
        try {
            updateDoc(doc(db, 'shopping_list', editingItem.id), {
                item: editItemName,
                estimatedAmount: parseFloat(editEstAmount) || 0,
            }).catch(err => {
                console.error("Background sync error", err);
            });

            // Reset UI immediately
            setEditingItem(null);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
            showAlert({ title: "Update Failed", message: "Failed to update item", type: "danger" });
        }
    };

    const openPurchaseModal = (item) => {
        setPurchasingItem(item);
        setActualPrice(item.estimatedAmount.toString());
    };

    const handleConfirmPurchase = () => {
        if (!purchasingItem) return;

        const currentItem = purchasingItem;
        const price = parseFloat(actualPrice) || 0;

        setLoading(true);

        try {
            const batch = writeBatch(db);
            const journalRef = doc(collection(db, 'journal'));
            const today = new Date();
            today.setHours(12, 0, 0, 0);

            batch.set(journalRef, {
                uid: user.uid,
                type: 'expense',
                amount: price,
                description: currentItem.item,
                date: Timestamp.fromDate(today),
                createdAt: serverTimestamp(),
                source: 'remember_list',
            });

            batch.delete(doc(db, 'shopping_list', currentItem.id));

            batch.commit().catch(err => {
                console.error("Background sync error", err);
            });

            // Reset UI immediately
            setPurchasingItem(null);
            setLoading(false);
        } catch (error) {
            console.error('Error moving item:', error);
            setLoading(false);
            showAlert({ title: "Failed", message: "Failed to update expense status", type: "danger" });
        }
    };


    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
            <PageHeader
                title="Shopping List"
                subtitle="Track items to purchase"
                icon={FiShoppingBag}
                iconClassName="bg-[var(--color-warning-light)] text-[var(--color-warning)]"
            />

            {/* Add Item Form */}
            <Card className="mb-6">
                <form onSubmit={handleAddItem} className="flex gap-2">
                    <div className="flex-1 space-y-2">
                        <Input
                            type="text"
                            placeholder="Item name (e.g. Milk, Sugar ...)"
                            value={itemName}
                            setValue={setItemName}
                        />
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={estAmount}
                            setValue={setEstAmount}
                            prefix="Rs."
                        />
                    </div>
                    <Button
                        type="submit"
                        icon={FiPlus}
                        loading={loading}
                        className="w-14 h-auto"
                    />
                </form>
            </Card>

            {/* Items List */}
            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 ml-1">
                To Buy ({items.length})
            </h3>

            {items.length === 0 ? (
                <EmptyState
                    icon={FiShoppingCart}
                    title="List is empty"
                    subtitle="Add items you need to buy"
                />
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <SwipeableCard
                            key={item.id}
                            canEdit={true}
                            onEdit={() => openEditModal(item)}
                            canDelete={true}
                            onDelete={() => handleDelete(item.id)}
                        >
                            <Card padding="sm" className="transition-transform active:scale-[0.98]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)] flex items-center justify-center shrink-0">
                                            <FiShoppingBag size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--color-text)] text-sm">{item.item}</p>
                                            {item.estimatedAmount > 0 && (
                                                <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                                                    Est: Rs. {item.estimatedAmount}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => openPurchaseModal(item)}
                                            className="p-2 rounded-lg bg-[var(--color-success-light)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white transition-all"
                                            title="Bought it!"
                                        >
                                            <FiCheck size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="hidden lg:flex p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-all"
                                            title="Delete"
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </SwipeableCard>
                    ))}
                </div>
            )}

            {/* Purchase Confirmation Modal */}
            <Modal
                isOpen={!!purchasingItem}
                onClose={() => setPurchasingItem(null)}
                title="Bought it?"
                footer={
                    <Button
                        text={loading ? 'Saving...' : 'Confirm & Add to Expense'}
                        onClick={handleConfirmPurchase}
                        loading={loading}
                        variant="success"
                        fullWidth
                        size="lg"
                    />
                }
            >
                {purchasingItem && (
                    <div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                            Confirm price for <span className="font-bold text-[var(--color-primary)]">{purchasingItem.item}</span>
                        </p>
                        <Input
                            label="Actual Price Paid"
                            type="number"
                            value={actualPrice}
                            setValue={setActualPrice}
                            prefix="Rs."
                            className="text-lg font-bold"
                            autoFocus
                        />
                    </div>
                )}
            </Modal>

            {/* Edit Item Modal */}
            <Modal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                title="Edit Item"
                footer={
                    <Button
                        text={loading ? 'Saving...' : 'Save Changes'}
                        onClick={handleEditSave}
                        loading={loading}
                        variant="primary"
                        fullWidth
                    />
                }
            >
                {editingItem && (
                    <form onSubmit={handleEditSave} className="space-y-4">
                        <Input
                            label="Item Name"
                            type="text"
                            value={editItemName}
                            setValue={setEditItemName}
                            autoFocus
                        />
                        <Input
                            label="Estimated Amount"
                            type="number"
                            value={editEstAmount}
                            setValue={setEditEstAmount}
                            prefix="Rs."
                        />
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Remember;
