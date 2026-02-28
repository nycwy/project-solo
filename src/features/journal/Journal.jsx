import { useState, useContext, useEffect, useMemo } from 'react';
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
import { useNavigate } from 'react-router-dom';
import {
    FiPlus,
    FiTrendingUp,
    FiTrendingDown,
    FiEdit2,
    FiTrash2,
    FiX,
    FiCalendar,
    FiLayout,
    FiShoppingBag,
    FiChevronDown,
    FiShoppingCart,
    FiPieChart,
} from 'react-icons/fi';


import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import SwipeableCard from '../../components/SwipeableCard';
import Spinner from '../../components/Spinner';
import useAlert from '../../hooks/useAlert';

const Journal = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useAlert();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('expense');
    const [editingId, setEditingId] = useState(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [dateValue, setDateValue] = useState('');
    const [drafts, setDrafts] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const [expandedMonth, setExpandedMonth] = useState(null);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'journal'),
            where('uid', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
            data.sort((a, b) => {
                const timeA = a.date?.toMillis ? a.date.toMillis() : (a.date?.seconds ? a.date.seconds * 1000 : Date.now());
                const timeB = b.date?.toMillis ? b.date.toMillis() : (b.date?.seconds ? b.date.seconds * 1000 : Date.now());
                if (timeB !== timeA) return timeB - timeA;
                // Tiebreaker: use createdAt for entries on the same date
                const createdA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
                const createdB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
                return createdB - createdA;
            });
            setEntries(data);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const grouped = useMemo(() => {
        const groups = {};
        entries.forEach((entry) => {
            const time = entry.date?.toMillis ? entry.date.toMillis() : (entry.date?.seconds ? entry.date.seconds * 1000 : Date.now());
            const dateObj = new Date(time);
            const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    month: dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    dateObj,
                    items: [],
                    monthIncome: 0,
                    monthExpense: 0,
                };
            }
            groups[key].items.push(entry);
            if (entry.type === 'income') groups[key].monthIncome += Number(entry.amount) || 0;
            else groups[key].monthExpense += Number(entry.amount) || 0;
        });
        // Sort items within each group: latest first
        Object.values(groups).forEach(group => {
            group.items.sort((a, b) => {
                const timeA = a.date?.toMillis ? a.date.toMillis() : (a.date?.seconds ? a.date.seconds * 1000 : Date.now());
                const timeB = b.date?.toMillis ? b.date.toMillis() : (b.date?.seconds ? b.date.seconds * 1000 : Date.now());
                if (timeB !== timeA) return timeB - timeA;
                const createdA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
                const createdB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
                return createdB - createdA;
            });
        });
        return Object.values(groups).sort((a, b) => b.dateObj - a.dateObj);
    }, [entries]);

    const currentMonthKey = useMemo(() => {
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth()}`;
    }, []);

    const totalIncome = useMemo(() => entries
        .filter((e) => {
            const time = e.date?.toMillis ? e.date.toMillis() : (e.date?.seconds ? e.date.seconds * 1000 : Date.now());
            const dateObj = new Date(time);
            return `${dateObj.getFullYear()}-${dateObj.getMonth()}` === currentMonthKey && e.type === 'income';
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [entries, currentMonthKey]);

    const totalExpense = useMemo(() => entries
        .filter((e) => {
            const time = e.date?.toMillis ? e.date.toMillis() : (e.date?.seconds ? e.date.seconds * 1000 : Date.now());
            const dateObj = new Date(time);
            return `${dateObj.getFullYear()}-${dateObj.getMonth()}` === currentMonthKey && e.type === 'expense';
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [entries, currentMonthKey]);

    const openAddModal = (type) => {
        setModalType(type);
        setEditingId(null);
        setAmount('');
        setDescription('');
        setDateValue('');
        setDrafts([]);
        setIsModalOpen(true);
    };

    const openEditModal = (entry) => {
        setEditingId(entry.id);
        setModalType(entry.type);
        setAmount(entry.amount.toString());
        setDescription(entry.description || '');
        if (entry.date?.seconds) {
            setDateValue(new Date(entry.date.seconds * 1000).toISOString().split('T')[0]);
        }
        setDrafts([]);
        setIsModalOpen(true);
    };

    const addToDraft = () => {
        if (!amount || parseFloat(amount) <= 0) return showAlert({ title: "Enter an amount", message: "Amount should be greater than zero.", type: "warning" });
        setDrafts((prev) => [
            ...prev,
            {
                amount: parseFloat(amount),
                description: description || modalType,
                date: dateValue,
                type: modalType,
            },
        ]);
        setAmount('');
        setDescription('');
    };

    const removeDraft = (index) => {
        setDrafts((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setAmount('');
        setDescription('');
        setDateValue('');
        setDrafts([]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const numAmount = parseFloat(amount);
        const activeDrafts = [...drafts];

        if (!editingId && numAmount > 0) {
            activeDrafts.push({
                amount: numAmount,
                description: description || modalType,
                date: dateValue,
                type: modalType,
            });
        }

        if (editingId) {
            if (!numAmount || numAmount <= 0) {
                setIsSaving(false);
                return showAlert({ title: "Enter an amount", message: "Amount should be greater than zero.", type: "warning" });
            }
        } else if (activeDrafts.length === 0) {
            setIsSaving(false);
            return showAlert({ title: "Nothing to save", message: "Add an amount or put something in the list first.", type: "warning" });
        }

        try {
            if (editingId) {
                const dateObj = dateValue ? new Date(dateValue) : new Date();
                dateObj.setHours(12, 0, 0, 0);

                await updateDoc(doc(db, 'journal', editingId), {
                    amount: numAmount,
                    description: description || modalType,
                    type: modalType,
                    date: Timestamp.fromDate(dateObj),
                });
            } else {
                const batch = writeBatch(db);
                activeDrafts.forEach((draft) => {
                    const dateObj = draft.date ? new Date(draft.date) : new Date();
                    dateObj.setHours(12, 0, 0, 0);
                    const newRef = doc(collection(db, 'journal'));
                    batch.set(newRef, {
                        uid: user.uid,
                        amount: draft.amount,
                        description: draft.description,
                        type: draft.type,
                        date: Timestamp.fromDate(dateObj),
                        createdAt: serverTimestamp(),
                    });
                });
                await batch.commit();
            }
            handleCloseModal(); // Close on success
        } catch (error) {
            console.error("Error saving journal entry:", error);
            showAlert({ title: "Couldn't save", message: "Something went wrong. Please try again.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };


    const handleDeleteEntry = (id) => {
        showConfirm({
            title: "Delete this?",
            message: "This entry will be permanently removed.",
            confirmText: "Delete",
            onConfirm: () => deleteDoc(doc(db, 'journal', id))
        });
    };

    const formatDate = (timestamp) => {
        const time = timestamp?.toMillis ? timestamp.toMillis() : (timestamp?.seconds ? timestamp.seconds * 1000 : Date.now());
        return new Date(time).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };



    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
            <PageHeader
                title="Journal"
                subtitle="Track your income & expenses"
                icon={FiLayout}
                rightContent={
                    <div className="flex gap-2">
                        <Button
                            icon={FiShoppingBag}
                            text="Shopping"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/purchase-list')}
                            className="hidden md:inline-flex"
                        />
                    </div>
                }
            />

            <div className="mb-6 grid grid-cols-2 gap-3">
                <div className="premium-card p-4 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors" onClick={() => openAddModal('income')}>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-1 block">Income <span className="text-emerald-500/70 text-[9px] font-medium ml-1">+ Add</span></span>
                    <p className="text-lg font-number font-semibold text-emerald-600 dark:text-emerald-400">Rs. {totalIncome.toFixed(0)}</p>
                </div>

                <div className="premium-card p-4 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors" onClick={() => openAddModal('expense')}>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-1 block">Expense <span className="text-rose-500/70 text-[9px] font-medium ml-1">+ Add</span></span>
                    <p className="text-lg font-number font-semibold text-rose-600 dark:text-rose-400">Rs. {totalExpense.toFixed(0)}</p>
                </div>

                <div className="premium-card p-4 col-span-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Net Savings</span>
                    <span className={`text-xl font-number font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        Rs. {(totalIncome - totalExpense).toFixed(0)}
                    </span>
                </div>
            </div>

            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 ml-1">
                All Entries ({entries.length})
            </h3>
            {grouped.length === 0 ? (
                <EmptyState
                    icon={FiLayout}
                    title="No journal entries yet"
                    subtitle="Tap the income or expense card above to start tracking."
                />
            ) : (
                <div className="space-y-4">
                    {grouped.map((group) => (
                        <div key={group.key}>
                            <button
                                onClick={() => setExpandedMonth(expandedMonth === group.key ? null : group.key)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30 transition-all mb-2"
                            >
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-sm font-bold text-[var(--color-text)]">{group.month}</span>
                                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">{group.items.length} entries</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 sm:gap-3 mr-1 sm:mr-2">
                                        <div className="flex flex-col items-start min-w-[50px]">
                                            <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Income</span>
                                            <span className="text-[10px] sm:text-xs font-bold text-emerald-500">Rs. {group.monthIncome.toFixed(0)}</span>
                                        </div>
                                        <div className="flex flex-col items-start min-w-[50px]">
                                            <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Expense</span>
                                            <span className="text-[10px] sm:text-xs font-bold text-rose-500">Rs. {group.monthExpense.toFixed(0)}</span>
                                        </div>
                                        <div className="flex flex-col items-start border-l border-[var(--color-border)] pl-2 sm:pl-3 min-w-[50px]">
                                            <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
                                                {(group.monthIncome - group.monthExpense) >= 0 ? 'Savings' : 'Loss'}
                                            </span>
                                            <span className={`text-[10px] sm:text-xs font-bold ${(group.monthIncome - group.monthExpense) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                Rs. {(group.monthIncome - group.monthExpense).toFixed(0)}
                                            </span>
                                        </div>
                                    </div>

                                    <FiChevronDown
                                        size={14}
                                        className={`text-[var(--color-text-muted)] transition-transform duration-200 ${expandedMonth === group.key ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </button>

                            {expandedMonth === group.key && (
                                <div className="space-y-1.5 animate-fade-in-up">
                                    {group.items.map((entry) => (
                                        <SwipeableCard
                                            key={entry.id}
                                            canEdit={true}
                                            onEdit={() => openEditModal(entry)}
                                            canDelete={true}
                                            onDelete={() => handleDeleteEntry(entry.id)}
                                        >
                                            <Card className="p-2.5 transition-transform active:scale-[0.98]">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-lg shrink-0 ${entry.type === 'income' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'}`}>
                                                        {entry.type === 'income' ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="text-sm font-semibold text-[var(--color-text)] truncate leading-tight">
                                                                {entry.description || entry.type}
                                                            </p>
                                                            <span className={`text-sm font-semibold shrink-0 ${entry.type === 'income' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                                                                {entry.type === 'income' ? '' : '-'} Rs.{entry.amount}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)] truncate mt-0.5">
                                                                <span>{formatDate(entry.date)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </SwipeableCard>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? 'Edit Entry' : `Add ${modalType === 'income' ? 'Income' : 'Expense'}`}
                icon={modalType === 'income' ? FiTrendingUp : FiTrendingDown}
                footer={
                    <div className="flex gap-2">
                        <Button
                            text={editingId ? 'Save Changes' : 'Save'}
                            variant={modalType === 'income' ? 'success' : 'danger'}
                            fullWidth
                            onClick={handleSave}
                            disabled={isSaving}
                            loading={isSaving}
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        setValue={setAmount}
                        prefix="Rs."
                        className="text-lg font-bold"
                        autoFocus
                    />
                    <Input
                        label="Description"
                        type="text"
                        placeholder={modalType === 'income' ? 'Salary, freelance...' : 'Food, transport...'}
                        value={description}
                        setValue={setDescription}
                    />
                    <Input
                        label="Date"
                        type="date"
                        value={dateValue}
                        setValue={setDateValue}
                        icon={FiCalendar}
                    />

                    {editingId && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setModalType('income')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${modalType === 'income' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'}`}
                            >
                                Income
                            </button>
                            <button
                                onClick={() => setModalType('expense')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${modalType === 'expense' ? 'bg-[var(--color-danger)] text-white' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'}`}
                            >
                                Expense
                            </button>
                        </div>
                    )}

                    {!editingId && (
                        <Button
                            text="Add Another to List"
                            icon={FiPlus}
                            variant="outline"
                            fullWidth
                            onClick={addToDraft}
                        />
                    )}

                    {drafts.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[var(--color-border-light)]">
                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Draft List ({drafts.length})</p>
                            {drafts.map((draft, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 bg-[var(--color-surface-alt)] rounded-xl">
                                    <div>
                                        <p className="text-sm font-bold text-[var(--color-text)]">{draft.description}</p>
                                        <p className={`text-xs font-bold ${draft.type === 'income' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                                            Rs. {draft.amount}
                                        </p>
                                    </div>
                                    <button onClick={() => removeDraft(i)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors">
                                        <FiX size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Journal;
