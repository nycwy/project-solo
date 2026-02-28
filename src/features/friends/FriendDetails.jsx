import { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    getDocs,
    serverTimestamp,
    getDoc,
    addDoc,
} from 'firebase/firestore';
import {
    FiArrowUpRight,
    FiArrowDownLeft,
    FiUser,
    FiClock,
    FiCheckCircle,
} from 'react-icons/fi';

import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import SwipeableCard from '../../components/SwipeableCard';
import useAlert from '../../hooks/useAlert';

const FriendDetails = () => {
    const { user } = useContext(AuthContext);
    const { id: friendId } = useParams();
    const { showAlert, showConfirm } = useAlert();
    const navigate = useNavigate();
    const [friendInfo, setFriendInfo] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!friendId) return;
        const fetchFriend = async () => {
            const snap = await getDoc(doc(db, 'users', friendId));
            if (snap.exists()) setFriendInfo(snap.data());
        };
        fetchFriend();
    }, [friendId]);

    useEffect(() => {
        if (!user?.uid || !friendId) return;

        const q1 = query(
            collection(db, 'transactions'),
            where('payerId', '==', user.uid),
            where('debtorId', '==', friendId)
        );
        const q2 = query(
            collection(db, 'transactions'),
            where('payerId', '==', friendId),
            where('debtorId', '==', user.uid)
        );

        const unsub1 = onSnapshot(q1, (snap) => {
            const data1 = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }), role: 'payer' }));
            setTransactions((prev) => {
                const others = prev.filter((t) => t.role !== 'payer');
                return [...others, ...data1].sort((a, b) => {
                    const timeA = a.date?.toMillis ? a.date.toMillis() : (a.date?.seconds ? a.date.seconds * 1000 : Date.now());
                    const timeB = b.date?.toMillis ? b.date.toMillis() : (b.date?.seconds ? b.date.seconds * 1000 : Date.now());
                    return timeB - timeA;
                });
            });
            setLoading(false);
        });

        const unsub2 = onSnapshot(q2, (snap) => {
            const data2 = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }), role: 'debtor' }));
            setTransactions((prev) => {
                const others = prev.filter((t) => t.role !== 'debtor');
                return [...others, ...data2].sort((a, b) => {
                    const timeA = a.date?.toMillis ? a.date.toMillis() : (a.date?.seconds ? a.date.seconds * 1000 : Date.now());
                    const timeB = b.date?.toMillis ? b.date.toMillis() : (b.date?.seconds ? b.date.seconds * 1000 : Date.now());
                    return timeB - timeA;
                });
            });
        });

        return () => { unsub1(); unsub2(); };
    }, [user, friendId]);

    const balance = transactions.reduce((sum, t) => {
        if (t.settleStatus === 'settled') return sum;
        if (t.role === 'payer' && t.status === 'confirmed') return sum + (Number(t.amount) || 0);
        if (t.role === 'debtor' && t.status === 'confirmed') return sum - (Number(t.amount) || 0);
        return sum;
    }, 0);

    const handleSettle = async (id) => {
        await updateDoc(doc(db, 'transactions', id), {
            settleStatus: 'settle_pending',
            settleRequestedAt: serverTimestamp(),
        });
    };

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
                        category: 'Fair Share Bill',
                        description: txData.description || 'Fair Share Expense',
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
            console.error('Error confirming settlement:', error);
        }
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Delete this?",
            message: "This will be gone forever.",
            confirmText: "Delete",
            onConfirm: async () => {
                const txSnap = await getDoc(doc(db, 'transactions', id));
                const txData = txSnap.exists() ? txSnap.data() : null;

                await deleteDoc(doc(db, 'transactions', id));

                if (txData?.batchId) {
                    const jq = query(
                        collection(db, 'journal'),
                        where('uid', '==', user.uid),
                        where('batchId', '==', txData.batchId)
                    );
                    const jSnap = await getDocs(jq);
                    jSnap.forEach(async (d) => await deleteDoc(d.ref));
                }
            }
        });
    };

    const formatDate = (ts) => {
        const time = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : Date.now());
        return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusBadge = (t) => {
        if (t.settleStatus === 'settled') return <Badge variant="success" icon={FiCheckCircle}>Settled</Badge>;
        if (t.settleStatus === 'settle_pending') return <Badge variant="purple" icon={FiClock}>Settling</Badge>;
        if (t.status === 'confirmed') return <Badge variant="success" icon={FiCheckCircle}>Confirmed</Badge>;
        if (t.status === 'pending') return <Badge variant="pending" icon={FiClock}>Pending</Badge>;
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    const friendName = friendInfo?.username || 'Friend';

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
            <PageHeader
                title={friendName}
                subtitle={friendInfo?.email}
                icon={FiUser}
            />

            <Card className={`mb-6 ${balance >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-pink-600'} border-none text-white`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-white/70 font-medium">Net Balance</p>
                        <p className="text-2xl font-extrabold">Rs. {Math.abs(balance).toFixed(0)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/70">
                            {balance > 0 ? `${friendName} will pay you` : balance < 0 ? `You will pay ${friendName}` : 'All settled!'}
                        </p>
                    </div>
                </div>
            </Card>

            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 ml-1">
                Transaction History ({transactions.length})
            </h3>

            {transactions.length === 0 ? (
                <EmptyState
                    icon={FiArrowUpRight}
                    title="Nothing here yet"
                    subtitle={`No shared expenses with ${friendName} yet`}
                />
            ) : (
                <div className="space-y-2">
                    {transactions.map((t) => {
                        const isPayer = t.role === 'payer';
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
                                                <Avatar name={friendInfo?.username || 'Friend'} size="xs" className="shrink-0 w-8 h-8" />
                                                <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
                                                    <span className="w-full text-sm font-semibold text-[var(--color-text)] truncate leading-tight">
                                                        {t.description}
                                                    </span>
                                                    <span className="w-full text-[11px] font-medium text-[var(--color-text-muted)] truncate mt-0.5">
                                                        {formatDate(t.date)} <span className="text-[9px] text-[var(--color-border)] mx-0.5">•</span> {isPayer ? `To ${friendInfo?.username || 'Friend'}` : `From ${friendInfo?.username || 'Friend'}`}
                                                    </span>
                                                    <span className="text-sm font-number font-bold text-white mt-0.5">
                                                        {isPayer ? '+' : '-'} Rs.{t.amount}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-1.5">
                                                <button onClick={(e) => { e.stopPropagation(); handleAccept(t.id); }} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-white bg-emerald-600 hover:bg-emerald-500 transition-colors select-none" title="Accept">
                                                    Accept
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleReject(t.id); }} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors select-none" title="Reject">
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2 w-full">
                                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                                                <Avatar name={friendInfo?.username || 'Friend'} size="xs" className="shrink-0 w-8 h-8" />
                                                <div className="flex-1 min-w-0 flex flex-col items-start">
                                                    <span className="w-full text-sm font-semibold text-[var(--color-text)] truncate leading-tight">
                                                        {t.description}
                                                    </span>
                                                    <span className="w-full text-[11px] font-medium text-[var(--color-text-muted)] truncate mt-0.5">
                                                        {formatDate(t.date)} <span className="text-[9px] text-[var(--color-border)] mx-0.5">•</span> {isPayer ? `To ${friendInfo?.username || 'Friend'}` : `From ${friendInfo?.username || 'Friend'}`}
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
                                                            <button onClick={(e) => { e.stopPropagation(); handleSettle(t.id); }} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-colors select-none">
                                                                Settle
                                                            </button>
                                                        )}

                                                        {isPayer && t.settleStatus === 'settle_pending' && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleConfirmSettle(t.id); }} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors select-none">
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
    );
};

export default FriendDetails;
