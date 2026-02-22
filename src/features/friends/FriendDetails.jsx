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
    FiUser,
    FiArrowUpRight,
    FiArrowDownLeft,
    FiCheck,
    FiEdit2,
    FiTrash2,
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

const FriendDetails = () => {
    const { user } = useContext(AuthContext);
    const { id: friendId } = useParams();
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
            const data1 = snap.docs.map((d) => ({ id: d.id, ...d.data(), role: 'payer' }));
            setTransactions((prev) => {
                const others = prev.filter((t) => t.role !== 'payer');
                return [...others, ...data1].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
            setLoading(false);
        });

        const unsub2 = onSnapshot(q2, (snap) => {
            const data2 = snap.docs.map((d) => ({ id: d.id, ...d.data(), role: 'debtor' }));
            setTransactions((prev) => {
                const others = prev.filter((t) => t.role !== 'debtor');
                return [...others, ...data2].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
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
            const friendName = friendInfo?.username || 'Friend';
            const otherNameDebtorView = txData.payerId === user.uid ? friendName : 'User';

            await updateDoc(txRef, { status: 'confirmed' });
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
            const friendName = friendInfo?.username || 'Friend';

            const payerViewOtherName = txData.payerId === user.uid ? friendName : 'User';
            const debtorViewOtherName = txData.debtorId === user.uid ? friendName : 'User';

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
        } catch (error) {
            console.error('Error confirming settlement:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this transaction permanently?')) {
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
    };

    const formatDate = (ts) => {
        if (!ts?.seconds) return '';
        return new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
                    title="No transactions"
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
                                <Card className="p-2.5 animate-fade-in-up transition-transform active:scale-[0.98]">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${isPayer ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'}`}>
                                            {isPayer ? <FiArrowUpRight size={14} /> : <FiArrowDownLeft size={14} />}
                                        </div>

                                        {/* The Layout Wrapper: Strict 2x2 Flex Grid */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">

                                            {/* Top Row (Always fixed): Description (Left) - Status/Amount (Right) */}
                                            <div className="flex justify-between items-start w-full gap-2">
                                                <span className="text-sm font-semibold text-[var(--color-text)] truncate leading-tight">
                                                    {t.description}
                                                </span>
                                                <div className="flex flex-col items-end justify-start gap-0.5 shrink-0 pl-2">
                                                    <span className={`text-[13px] font-number font-bold leading-none ${isPayer ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                                                        {isPayer ? '+' : '-'} Rs.{t.amount}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bottom Row (Dynamic Slot): Meta (Left) - Actions/Badges (Right) */}
                                            <div className="flex justify-between items-center w-full gap-2 mt-0.5">
                                                <span className="flex-1 min-w-0 text-[11px] font-medium text-[var(--color-text-muted)] truncate">
                                                    {formatDate(t.date)}
                                                </span>

                                                <div className="shrink-0 flex items-center gap-1.5 justify-end h-6">
                                                    {/* Dynamic Logic for Bottom Right */}
                                                    {!isPayer && t.status === 'pending' && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleAccept(t.id); }} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-white bg-emerald-600 hover:bg-emerald-500 transition-colors select-none" title="Accept">
                                                                Accept
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleReject(t.id); }} className="h-6 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold tracking-wide uppercase text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors select-none" title="Reject">
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {((!isPayer && t.status === 'confirmed' && t.settleStatus !== 'settled' && t.settleStatus !== 'settle_pending') || (isPayer && t.settleStatus === 'settle_pending')) && (
                                                        <>
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
                                                        </>
                                                    )}

                                                    <div className="transform origin-right scale-[0.80] -mr-1">
                                                        {getStatusBadge(t)}
                                                    </div>
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
    );
};

export default FriendDetails;
