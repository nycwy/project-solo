import { useState, useContext, useEffect, useMemo } from 'react';
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
    addDoc,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
    FiArrowUpRight,
    FiArrowDownLeft,
    FiCheck,
    FiX,
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
import useAlert from '../../hooks/useAlert';


const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const { showAlert, showConfirm } = useAlert();
    const navigate = useNavigate();
    const [payerTransactions, setPayerTransactions] = useState([]);
    const [debtorTransactions, setDebtorTransactions] = useState([]);
    const [friendsMap, setFriendsMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        let isMounted = true;
        const fetchFriends = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'users', user.uid));
                if (isMounted && docSnap.exists()) {
                    const list = docSnap.data().friendsList || [];
                    const map = {};
                    list.forEach((f) => (map[f.uid] = f.username));
                    setFriendsMap(map);
                }
            } catch (err) {
                console.error("Error fetching friends:", err);
            }
        };
        fetchFriends();
        return () => { isMounted = false; };
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
                    .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))
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
                    .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))
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

    const balances = useMemo(() => {
        const friendBalances = {};

        payerTransactions.forEach((t) => {
            if (t.debtorId !== 'SELF' && t.status === 'confirmed' && t.settleStatus !== 'settled') {
                const amount = Number(t.amount) || 0;
                friendBalances[t.debtorId] = (friendBalances[t.debtorId] || 0) + amount;
            }
        });

        debtorTransactions.forEach((t) => {
            if (t.status === 'confirmed' && t.settleStatus !== 'settled') {
                const amount = Number(t.amount) || 0;
                friendBalances[t.payerId] = (friendBalances[t.payerId] || 0) - amount;
            }
        });

        let totalOwed = 0;
        let totalDebt = 0;

        Object.values(friendBalances).forEach((balance) => {
            if (balance > 0) {
                totalOwed += balance;
            } else if (balance < 0) {
                totalDebt += Math.abs(balance);
            }
        });

        return {
            totalOwed,
            totalDebt,
            netBalance: totalOwed - totalDebt
        };
    }, [payerTransactions, debtorTransactions]);

    const { totalOwed, totalDebt, netBalance } = balances;

    const allTransactions = useMemo(() => {
        return [...payerTransactions, ...debtorTransactions].sort((a, b) => {
            const timeA = a.date?.toMillis ? a.date.toMillis() : (a.date?.seconds ? a.date.seconds * 1000 : Date.now());
            const timeB = b.date?.toMillis ? b.date.toMillis() : (b.date?.seconds ? b.date.seconds * 1000 : Date.now());
            return timeB - timeA;
        });
    }, [payerTransactions, debtorTransactions]);


    const handleAccept = async (id) => {
        try {
            const txRef = doc(db, 'transactions', id);
            const txSnap = await getDoc(txRef);

            if (!txSnap.exists()) return;
            const txData = txSnap.data();
            const amount = Number(txData.amount) || 0;

            showConfirm({
                title: "Accept this?",
                message: `Accept this transaction for Rs. ${amount}?`,
                confirmText: "Accept",
                type: "success",
                onConfirm: () => updateDoc(txRef, { status: 'confirmed' })
            });
        } catch (error) {
            console.error('Error accepting transaction:', error);
        }
    };

    const handleReject = async (id) => {
        await updateDoc(doc(db, 'transactions', id), { status: 'rejected' });
    };

    const handleSettle = (id) => {
        showConfirm({
            title: "Settle up?",
            message: "Send a settle request for this one?",
            confirmText: "Request Settle",
            type: "info",
            onConfirm: () => updateDoc(doc(db, 'transactions', id), {
                settleStatus: 'settle_pending',
                settleRequestedAt: serverTimestamp(),
            })
        });
    };

    const handleConfirmSettle = async (id) => {
        try {
            const txRef = doc(db, 'transactions', id);
            const txSnap = await getDoc(txRef);

            if (!txSnap.exists()) return;
            const txData = txSnap.data();
            const amount = Number(txData.amount) || 0;

            showConfirm({
                title: "All settled?",
                message: `Mark Rs. ${amount} as paid? We'll log it in your journal.`,
                confirmText: "Confirm",
                type: "success",
                onConfirm: async () => {
                    await addDoc(collection(db, 'journal'), {
                        uid: txData.debtorId,
                        type: 'expense',
                        amount: amount,
                        category: 'Split Bill',
                        description: txData.description || 'Split Expense',
                        date: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        autoSplit: true
                    });

                    await updateDoc(txRef, {
                        settleStatus: 'settled',
                        status: 'confirmed',
                    });
                }
            });
        } catch (error) {
            console.error('Error settling transaction:', error);
        }
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Hide this?",
            message: "Hide this transaction from your dashboard? You can still see it in friend details.",
            confirmText: "Hide",
            onConfirm: () => updateDoc(doc(db, 'transactions', id), {
                hiddenBy: arrayUnion(user.uid),
            })
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
                subtitle={<>Manage shared expenses</>}
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

            <div className="mb-6 grid grid-cols-2 gap-3">
                <div className="premium-card p-4">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-1 block">You Get Back</span>
                    <p className="text-lg font-number font-semibold text-emerald-600 dark:text-emerald-400">Rs. {totalOwed.toFixed(0)}</p>
                </div>

                <div className="premium-card p-4">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-1 block">You Pay</span>
                    <p className="text-lg font-number font-semibold text-rose-600 dark:text-rose-400">Rs. {totalDebt.toFixed(0)}</p>
                </div>

                <div className="premium-card p-4 col-span-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Net Balance</span>
                    <span className={`text-xl font-number font-bold ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {netBalance >= 0 ? '+' : '-'} Rs. {Math.abs(netBalance).toFixed(0)}
                    </span>
                </div>
            </div>

            <div className="pb-20 lg:pb-0">
                <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 ml-1">
                    All Activity ({allTransactions.length})
                </h3>

                {allTransactions.length === 0 ? (
                    <EmptyState
                        icon={FiDollarSign}
                        title="No expenses yet"
                        subtitle="Tap + to split a bill"
                    />
                ) : (
                    <div className="w-full max-w-[100vw] overflow-x-hidden space-y-2">
                        {allTransactions.map((t) => {
                            const isPayer = t.payerId === user.uid;
                            const otherName = isPayer ? getName(t.debtorId) : getName(t.payerId);

                            return (
                                <SwipeableCard
                                    key={t.id}
                                    canEdit={isPayer && !t.settleStatus && t.status !== 'confirmed'}
                                    onEdit={() => navigate(`/edit-expense/${t.id}`)}
                                    canDelete={isPayer}
                                    onDelete={() => handleDelete(t.id)}
                                >
                                    <Card className="p-2.5 w-full max-w-full overflow-hidden animate-fade-in-up transition-transform active:scale-[0.98]">
                                        {!isPayer && t.status === 'pending' ? (
                                            <div className="flex items-center justify-between gap-2 w-full">
                                                <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                                                    <Avatar name={otherName} size="xs" className="shrink-0 w-8 h-8" />
                                                    <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
                                                        <span className="w-full text-sm font-semibold text-[var(--color-text)] truncate leading-tight">
                                                            {t.description}
                                                        </span>
                                                        <span className="w-full text-[11px] font-medium text-[var(--color-text-muted)] truncate mt-0.5">
                                                            {formatDate(t.date)} <span className="text-[9px] text-[var(--color-border)] mx-0.5">•</span> {isPayer ? `To ${otherName}` : `From ${otherName}`}
                                                        </span>
                                                        <span className="text-sm font-number font-bold text-white mt-0.5">
                                                            {isPayer ? '+' : '-'} Rs.{t.amount}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 flex items-center gap-1.5">
                                                    <button onClick={() => handleAccept(t.id)} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-white bg-emerald-600 hover:bg-emerald-500 transition-colors select-none" title="Accept">
                                                        Accept
                                                    </button>
                                                    <button onClick={() => handleReject(t.id)} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors select-none" title="Reject">
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-2 w-full">
                                                <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                                                    <Avatar name={otherName} size="xs" className="shrink-0 w-8 h-8" />
                                                    <div className="flex-1 min-w-0 flex flex-col items-start">
                                                        <span className="w-full text-sm font-semibold text-[var(--color-text)] truncate leading-tight">
                                                            {t.description}
                                                        </span>
                                                        <span className="w-full text-[11px] font-medium text-[var(--color-text-muted)] truncate mt-0.5">
                                                            {formatDate(t.date)} <span className="text-[9px] text-[var(--color-border)] mx-0.5">•</span> {isPayer ? `To ${otherName}` : `From ${otherName}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 flex flex-col items-end gap-1">
                                                    <div className="flex flex-col items-end justify-center gap-0.5">
                                                        {t.status !== 'pending' && (!isPayer || t.settleStatus !== 'settle_pending') && (
                                                            <div className="transform origin-right scale-[0.80]">
                                                                {getStatusBadge(t)}
                                                            </div>
                                                        )}
                                                        <span className={`text-[13px] font-number font-bold leading-none ${isPayer ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                                                            {isPayer ? '+' : '-'} Rs.{t.amount}
                                                        </span>
                                                    </div>

                                                    {((!isPayer && t.status === 'confirmed' && t.settleStatus !== 'settled' && t.settleStatus !== 'settle_pending') || (isPayer && t.settleStatus === 'settle_pending')) && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {!isPayer && t.status === 'confirmed' && t.settleStatus !== 'settled' && t.settleStatus !== 'settle_pending' && (
                                                                <button onClick={() => handleSettle(t.id)} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-colors select-none">
                                                                    Settle
                                                                </button>
                                                            )}

                                                            {isPayer && t.settleStatus === 'settle_pending' && (
                                                                <button onClick={() => handleConfirmSettle(t.id)} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors select-none">
                                                                    Confirm
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                </SwipeableCard>
                            );
                        })}
                    </div>
                )}
            </div>

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
