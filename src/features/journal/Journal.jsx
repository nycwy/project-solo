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

const Journal = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('expense');
    const [editingId, setEditingId] = useState(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [dateValue, setDateValue] = useState('');
    const [drafts, setDrafts] = useState([]);

    const [expandedMonth, setExpandedMonth] = useState(null);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'journal'),
            where('uid', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            setEntries(data);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const getGroupedEntries = () => {
        const groups = {};
        entries.forEach((entry) => {
            if (!entry.date?.seconds) return;
            const dateObj = new Date(entry.date.seconds * 1000);
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
        return Object.values(groups).sort((a, b) => b.dateObj - a.dateObj);
    };

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentMonthKey = `${currentYear}-${currentMonth}`;

    const totalIncome = entries
        .filter((e) => {
            if (!e.date?.seconds) return false;
            const dateObj = new Date(e.date.seconds * 1000);
            return `${dateObj.getFullYear()}-${dateObj.getMonth()}` === currentMonthKey && e.type === 'income';
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalExpense = entries
        .filter((e) => {
            if (!e.date?.seconds) return false;
            const dateObj = new Date(e.date.seconds * 1000);
            return `${dateObj.getFullYear()}-${dateObj.getMonth()}` === currentMonthKey && e.type === 'expense';
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

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
        if (!amount || parseFloat(amount) <= 0) return alert('Enter a valid amount');
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

    const handleSave = async () => {
        if (editingId) {
            const numAmount = parseFloat(amount);
            if (!numAmount || numAmount <= 0) return alert('Enter a valid amount');

            const dateObj = dateValue ? new Date(dateValue) : new Date();
            dateObj.setHours(12, 0, 0, 0);

            await updateDoc(doc(db, 'journal', editingId), {
                amount: numAmount,
                description: description || modalType,
                type: modalType,
                date: Timestamp.fromDate(dateObj),
            });
        } else {
            let finalDrafts = [...drafts];
            if (amount && parseFloat(amount) > 0) {
                finalDrafts.push({
                    amount: parseFloat(amount),
                    description: description || modalType,
                    date: dateValue,
                    type: modalType,
                });
            }

            if (finalDrafts.length === 0) return alert('Add at least one entry');

            const batch = writeBatch(db);
            finalDrafts.forEach((draft) => {
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

        setIsModalOpen(false);
    };

    const handleDeleteEntry = async (id) => {
        if (window.confirm('Delete this entry?')) {
            await deleteDoc(doc(db, 'journal', id));
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp?.seconds) return '';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const grouped = getGroupedEntries();

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

            {/* Summary Card */}
            <div className="mb-6">
                <div className="rounded-2xl p-5 bg-[var(--color-surface)] border border-[var(--color-border-light)] shadow-[0_1px_4px_var(--color-shadow)]">
                    {/* Income & Expense */}
                    <div className="grid grid-cols-2 divide-x divide-[var(--color-border-light)]">
                        {/* Income */}
                        <div className="pr-4 cursor-pointer group" onClick={() => openAddModal('income')}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-widest">Income</span>
                            </div>
                            <p className="text-xl font-bold text-[var(--color-text)] tracking-tight">Rs. {totalIncome.toFixed(0)}</p>
                            <span className="text-[10px] text-emerald-500/70 font-medium mt-1 inline-flex items-center gap-0.5 group-active:scale-95 transition-transform">Add Income</span>
                        </div>

                        {/* Expense */}
                        <div className="pl-4 cursor-pointer group" onClick={() => openAddModal('expense')}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-widest">Expense</span>
                            </div>
                            <p className="text-xl font-bold text-[var(--color-text)] tracking-tight">Rs. {totalExpense.toFixed(0)}</p>
                            <span className="text-[10px] text-rose-500/70 font-medium mt-1 inline-flex items-center gap-0.5 group-active:scale-95 transition-transform">Add Expense</span>
                        </div>
                    </div>

                    {/* Net Savings */}
                    <div className="border-t border-[var(--color-border-light)] mt-4 pt-3 flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)] font-medium">Net Savings</span>
                        <span className={`text-base font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            Rs. {(totalIncome - totalExpense).toFixed(0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Grouped Monthly Entries */}
            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 ml-1">
                All Entries ({entries.length})
            </h3>
            {grouped.length === 0 ? (
                <EmptyState
                    icon={FiLayout}
                    title="No journal entries yet"
                    subtitle="Tap 'Add Income' or 'Add Expense' above to get started."
                />
            ) : (
                <div className="space-y-4">
                    {grouped.map((group) => (
                        <div key={group.key}>
                            {/* Month Header */}
                            <button
                                onClick={() => setExpandedMonth(expandedMonth === group.key ? null : group.key)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30 transition-all mb-2"
                            >
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-sm font-bold text-[var(--color-text)]">{group.month}</span>
                                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">{group.items.length} entries</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {group.key !== currentMonthKey && (
                                        <div className="flex items-center gap-2 sm:gap-3 mr-1 sm:mr-2">
                                            {/* Income */}
                                            <div className="flex flex-col items-start min-w-[50px]">
                                                <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Income</span>
                                                <span className="text-[10px] sm:text-xs font-bold text-emerald-500">Rs. {group.monthIncome.toFixed(0)}</span>
                                            </div>
                                            {/* Expense */}
                                            <div className="flex flex-col items-start min-w-[50px]">
                                                <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Expense</span>
                                                <span className="text-[10px] sm:text-xs font-bold text-rose-500">Rs. {group.monthExpense.toFixed(0)}</span>
                                            </div>
                                            {/* Net */}
                                            <div className="flex flex-col items-start border-l border-[var(--color-border)] pl-2 sm:pl-3 min-w-[50px]">
                                                <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Net</span>
                                                <span className={`text-[10px] sm:text-xs font-bold ${(group.monthIncome - group.monthExpense) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    Rs. {(group.monthIncome - group.monthExpense).toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <FiChevronDown
                                        size={14}
                                        className={`text-[var(--color-text-muted)] transition-transform duration-200 ${expandedMonth === group.key ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </button>

                            {/* Entries */}
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
                                            <Card padding="sm" className="transition-transform active:scale-[0.98]">
                                                <div className="flex items-center gap-3">
                                                    {/* Icon */}
                                                    <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${entry.type === 'income' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'}`}>
                                                        {entry.type === 'income' ? <FiTrendingUp size={15} /> : <FiTrendingDown size={15} />}
                                                    </div>

                                                    {/* Details — flex rows layout */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        {/* Top Row */}
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{entry.description || entry.type}</p>
                                                            <span className={`text-sm font-semibold shrink-0 ${entry.type === 'income' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                                                                {entry.type === 'income' ? '' : '-'} Rs.{entry.amount}
                                                            </span>
                                                        </div>

                                                        {/* Bottom Row */}
                                                        <div className="flex items-center justify-between gap-2 mt-0.5">
                                                            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] truncate">
                                                                <span>{formatDate(entry.date)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 justify-end shrink-0">
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

            {/* Add Entry Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Edit Entry' : `Add ${modalType === 'income' ? 'Income' : 'Expense'}`}
                icon={modalType === 'income' ? FiTrendingUp : FiTrendingDown}
                footer={
                    <div className="flex gap-2">
                        <Button
                            text={editingId ? 'Save Changes' : 'Save'}
                            variant={modalType === 'income' ? 'success' : 'danger'}
                            fullWidth
                            onClick={handleSave}
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

                    {/* Type Toggle (for editing) */}
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

                    {/* Add Another (only for new entries) */}
                    {!editingId && (
                        <Button
                            text="Add Another to List"
                            icon={FiPlus}
                            variant="outline"
                            fullWidth
                            onClick={addToDraft}
                        />
                    )}

                    {/* Drafts List */}
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
