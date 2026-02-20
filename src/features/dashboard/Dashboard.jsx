import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    arrayUnion,
    getDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
    FiArrowUpRight,
    FiArrowDownLeft,
    FiCheck,
    FiX,
    FiEdit2,
    FiTrash2,
    FiClock,
    FiCheckCircle,
    FiDollarSign,
    FiPlus,
} from 'react-icons/fi';

import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Avatar from '../../components/Avatar';
import Spinner from '../../components/Spinner';
import SwipeableCard from '../../components/SwipeableCard';


const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [payerTransactions, setPayerTransactions] = useState([]);
    const [debtorTransactions, setDebtorTransactions] = useState([]);
    const [friendsMap, setFriendsMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        const fetchFriends = async () => {
            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
                const list = docSnap.data().friendsList || [];
                const map = {};
                list.forEach((f) => (map[f.uid] = f.username));
                setFriendsMap(map);
            }
        };
        fetchFriends();
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'transactions'),
            where('payerId', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            setPayerTransactions(
                snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((t) => !t.hiddenBy?.includes(user.uid))
            );
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'transactions'),
            where('debtorId', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            setDebtorTransactions(
                snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((t) => !t.hiddenBy?.includes(user.uid))
            );
        });
        return () => unsub();
    }, [user]);

    const getName = (uid) => {
        if (uid === user.uid) return 'You';
        if (uid === 'SELF') return 'Self';
        return friendsMap[uid] || 'Unknown';
    };

    const totalOwed = payerTransactions
        .filter((t) => t.debtorId !== 'SELF' && t.status !== 'confirmed')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalDebt = debtorTransactions
        .filter((t) => t.status !== 'confirmed')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const netBalance = totalOwed - totalDebt;

    const allTransactions = [...payerTransactions, ...debtorTransactions].sort(
        (a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)
    );

    const handleAccept = async (id) => {
        await updateDoc(doc(db, 'transactions', id), { status: 'confirmed' });
    };

    const handleReject = async (id) => {
        await updateDoc(doc(db, 'transactions', id), { status: 'rejected' });
    };

    const handleSettle = async (id) => {
        await updateDoc(doc(db, 'transactions', id), {
            settleStatus: 'settle_pending',
            settleRequestedAt: serverTimestamp(),
        });
    };

    const handleConfirmSettle = async (id) => {
        await updateDoc(doc(db, 'transactions', id), {
            settleStatus: 'settled',
            status: 'confirmed',
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove from your view?')) return;
        await updateDoc(doc(db, 'transactions', id), {
            hiddenBy: arrayUnion(user.uid),
        });
    };

    const formatDate = (timestamp) => {
        if (!timestamp?.seconds) return '';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (t) => {
        if (t.debtorId === 'SELF') return <Badge variant="gray">Personal</Badge>;
        if (t.settleStatus === 'settled') return <Badge variant="success" icon={FiCheckCircle}>Settled</Badge>;
        if (t.settleStatus === 'settle_pending') return <Badge variant="purple" icon={FiClock}>Settling</Badge>;
        if (t.status === 'confirmed') return <Badge variant="success" icon={FiCheckCircle}>Confirmed</Badge>;
        if (t.status === 'pending') return <Badge variant="pending" icon={FiClock}>Pending</Badge>;
        if (t.status === 'rejected') return <Badge variant="danger" icon={FiX}>Rejected</Badge>;
        return null;
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
                title="Splitter"
                subtitle={<>Manage shared expenses <span className="lg:hidden">· Tap + to split</span></>}
                icon={FiDollarSign}
                rightContent={
                    <span className="hidden lg:inline-flex">
                        <Button
                            text="Add Expense"
                            icon={FiPlus}
                            size="sm"
                            onClick={() => navigate('/add-expense')}
                        />
                    </span>
                }
            />

            {/* Summary Card */}
            <div className="mb-6">
                <div className="rounded-2xl p-5 bg-[var(--color-surface)] border border-[var(--color-border-light)] shadow-[0_1px_4px_var(--color-shadow)]">
                    {/* You Get / You Pay */}
                    <div className="grid grid-cols-2 divide-x divide-[var(--color-border-light)]">
                        {/* You Get Back */}
                        <div className="pr-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-widest">You Get Back</span>
                            </div>
                            <p className="text-xl font-bold text-[var(--color-text)] tracking-tight">Rs. {totalOwed.toFixed(0)}</p>
                        </div>

                        {/* You Need to Pay */}
                        <div className="pl-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-widest">You Pay</span>
                            </div>
                            <p className="text-xl font-bold text-[var(--color-text)] tracking-tight">Rs. {totalDebt.toFixed(0)}</p>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="border-t border-[var(--color-border-light)] mt-4 pt-3 flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)] font-medium">Total</span>
                        <span className={`text-base font-bold ${netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {netBalance >= 0 ? '+' : '-'} Rs. {Math.abs(netBalance).toFixed(0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Transactions */}
            <div className="pb-20 lg:pb-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                        All Activity ({allTransactions.length})
                    </h2>
                </div>

                {allTransactions.length === 0 ? (
                    <EmptyState
                        icon={FiDollarSign}
                        title="No expenses yet"
                        subtitle="Add your first shared expense to get started"
                        actionText="Add Expense"
                        onAction={() => navigate('/add-expense')}
                    />
                ) : (
                    <div className="space-y-2">
                        {allTransactions.map((t) => {
                            const isPayer = t.payerId === user.uid;
                            const otherName = isPayer ? getName(t.debtorId) : getName(t.payerId);

                            return (
                                <SwipeableCard
                                    key={t.id}
                                    canEdit={isPayer && !t.settleStatus && t.status !== 'confirmed'}
                                    onEdit={() => navigate(`/edit-expense/${t.id}`)}
                                    canDelete={true}
                                    onDelete={() => handleDelete(t.id)}
                                >
                                    <Card padding="sm" className="animate-fade-in-up transition-transform active:scale-[0.98]">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={otherName} size="sm" />

                                            {/* Details — flex left/right layout */}
                                            {/* Details — flex rows layout */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                {/* Top Row: Description & Amount */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                                                        {t.description}
                                                    </p>
                                                    <span className={`text-sm font-semibold shrink-0 ${isPayer ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                                                        {isPayer ? '+' : '-'} Rs.{t.amount}
                                                    </span>
                                                </div>

                                                {/* Bottom Row: Date/Info & Status Badge */}
                                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] truncate">
                                                        <span>{isPayer ? `To ${otherName}` : `From ${otherName}`}</span>
                                                        <span className="text-[10px]">•</span>
                                                        <span>{formatDate(t.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 justify-end shrink-0">
                                                        {!isPayer && t.status === 'pending' && (
                                                            <>
                                                                <button onClick={() => handleAccept(t.id)} className="p-1 rounded-md bg-[var(--color-success-light)] text-[var(--color-success)] hover:opacity-80 transition-all" title="Accept">
                                                                    <FiCheck size={12} />
                                                                </button>
                                                                <button onClick={() => handleReject(t.id)} className="p-1 rounded-md bg-[var(--color-danger-light)] text-[var(--color-danger)] hover:opacity-80 transition-all" title="Reject">
                                                                    <FiX size={12} />
                                                                </button>
                                                            </>
                                                        )}

                                                        {!isPayer && t.status === 'confirmed' && t.settleStatus !== 'settled' && t.settleStatus !== 'settle_pending' && (
                                                            <Button size="xs" variant="outline" text="Settle" onClick={() => handleSettle(t.id)} />
                                                        )}

                                                        {isPayer && t.settleStatus === 'settle_pending' && (
                                                            <Button size="xs" variant="success" text="Confirm" onClick={() => handleConfirmSettle(t.id)} />
                                                        )}

                                                        {getStatusBadge(t)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </SwipeableCard>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Mobile FAB */}
            <button
                onClick={() => navigate('/add-expense')}
                className="lg:hidden fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 flex items-center justify-center hover:opacity-90 active:scale-90 transition-all"
                title="Split Expense"
            >
                <FiPlus size={24} />
            </button>
        </div>
    );
};

export default Dashboard;
