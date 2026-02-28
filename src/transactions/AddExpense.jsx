import { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { db } from '../services/firebase';
import {
    collection,
    serverTimestamp,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';
import {
    FiUsers,
    FiCheck,
    FiChevronUp,
    FiChevronDown,
    FiDollarSign,
    FiSearch,
    FiAlertCircle,
} from 'react-icons/fi';

import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import useAlert from '../hooks/useAlert';

const AddExpense = () => {
    const { user } = useContext(AuthContext);
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const { id } = useParams();

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [participants, setParticipants] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showFriendSelector, setShowFriendSelector] = useState(false);
    const [existingBatchId, setExistingBatchId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Unequal split state
    const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'exact'
    const [exactAmounts, setExactAmounts] = useState({}); // { [uid]: string }

    useEffect(() => {
        const fetchFriends = async () => {
            if (user?.uid) {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFriends(docSnap.data().friendsList || []);
                }
                if (!id) setParticipants([user.uid]);
            }
        };
        fetchFriends();
    }, [user, id]);

    useEffect(() => {
        const fetchTransaction = async () => {
            if (!id) return;
            setIsEditing(true);
            setLoading(true);

            try {
                const mainDoc = await getDoc(doc(db, 'transactions', id));
                if (!mainDoc.exists()) {
                    showAlert({ title: "Gone", message: "That expense doesn't exist anymore.", type: "warning" });
                    navigate('/split');
                    return;
                }

                const data = mainDoc.data();
                if (data.payerId !== user.uid) {
                    showAlert({ title: "Can't edit this", message: "You can only edit expenses you created.", type: "danger" });
                    navigate('/split');
                    return;
                }

                setDescription(data.description);
                const totalAmount = data.originalAmount || data.amount;
                setAmount(totalAmount.toString());

                if (data.batchId) {
                    setExistingBatchId(data.batchId);
                    const q = query(
                        collection(db, 'transactions'),
                        where('batchId', '==', data.batchId)
                    );
                    const batchSnap = await getDocs(q);
                    const foundParticipants = new Set([user.uid]);
                    const foundExactAmounts = {};

                    batchSnap.forEach((d) => {
                        const t = d.data();
                        if (t.debtorId !== 'SELF') {
                            foundParticipants.add(t.debtorId);
                            foundExactAmounts[t.debtorId] = t.amount.toString();
                        }
                    });

                    const participantArr = Array.from(foundParticipants);
                    setParticipants(participantArr);

                    // Determine if it was an EXACT split
                    const firstDoc = batchSnap.docs[0]?.data();
                    if (firstDoc?.splitType === 'EXACT') {
                        setSplitMode('exact');
                        // Calculate payer's share from journal or derive it
                        const jq = query(
                            collection(db, 'journal'),
                            where('uid', '==', user.uid),
                            where('batchId', '==', data.batchId)
                        );
                        const journalSnap = await getDocs(jq);
                        if (!journalSnap.empty) {
                            foundExactAmounts[user.uid] = journalSnap.docs[0].data().amount.toString();
                        } else {
                            foundExactAmounts[user.uid] = '0';
                        }
                        setExactAmounts(foundExactAmounts);
                    }
                } else {
                    if (data.debtorId !== 'SELF') {
                        setParticipants([user.uid, data.debtorId]);
                    } else {
                        setParticipants([user.uid]);
                    }
                }
            } catch (error) {
                console.error('Error fetching expense details:', error);
            }
            setLoading(false);
        };

        if (user) fetchTransaction();
    }, [id, user, navigate, showAlert]);

    // Sync exactAmounts keys when participants change
    useEffect(() => {
        if (splitMode === 'exact' && participants.length > 1) {
            setExactAmounts(prev => {
                const updated = {};
                participants.forEach(pId => {
                    updated[pId] = prev[pId] ?? '';
                });
                return updated;
            });
        }
    }, [participants, splitMode]);

    const toggleParticipant = (friendId) => {
        setParticipants((prev) =>
            prev.includes(friendId) ? prev.filter((p) => p !== friendId) : [...prev, friendId]
        );
        setSearchTerm('');
    };

    const handleSplitModeChange = (mode) => {
        setSplitMode(mode);
        if (mode === 'exact') {
            const init = {};
            participants.forEach(pId => { init[pId] = ''; });
            setExactAmounts(init);
        }
    };

    const updateExactAmount = (uid, value) => {
        setExactAmounts(prev => ({ ...prev, [uid]: value }));
    };

    // Compute totals for exact mode
    const exactTotal = useMemo(() => {
        if (splitMode !== 'exact') return 0;
        return Object.values(exactAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    }, [exactAmounts, splitMode]);

    const numericAmount = parseFloat(amount) || 0;
    const exactDiff = numericAmount - exactTotal;
    const isExactValid = splitMode === 'exact' && Math.abs(exactDiff) < 0.01;

    // Helper to get friend name
    const getFriendName = (uid) => {
        if (uid === user?.uid) return 'You (Payer)';
        const f = friends.find(f => f.uid === uid);
        return f?.username || 'Unknown';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isNaN(numericAmount) || numericAmount <= 0) {
                setLoading(false);
                return showAlert({
                    title: "Enter an amount",
                    message: "The bill should be more than zero.",
                    type: "warning"
                });
            }

            const sanitizedDescription = description.trim().replace(/[<>]/g, "");
            if (!sanitizedDescription) {
                setLoading(false);
                return showAlert({
                    title: "What's it for?",
                    message: "Add a short description so you remember later.",
                    type: "warning"
                });
            }

            if (participants.length === 0) {
                setLoading(false);
                return showAlert({
                    title: "Pick someone",
                    message: "Select at least one person for Fair Share.",
                    type: "warning"
                });
            }

            // Exact mode validation
            if (splitMode === 'exact' && participants.length > 1) {
                if (!isExactValid) {
                    setLoading(false);
                    const diff = exactDiff;
                    return showAlert({
                        title: "Amounts don't add up",
                        message: diff > 0
                            ? `You're Rs. ${diff.toFixed(2)} short. Adjust the amounts to match the total bill.`
                            : `You're Rs. ${Math.abs(diff).toFixed(2)} over. Adjust the amounts to match the total bill.`,
                        type: "warning"
                    });
                }
            }

            const newBatchId = existingBatchId || Date.now().toString();
            const batch = writeBatch(db);

            if (isEditing) {
                if (existingBatchId) {
                    const q = query(collection(db, 'transactions'), where('batchId', '==', existingBatchId));
                    const oldDocs = await getDocs(q);
                    oldDocs.forEach((d) => batch.delete(d.ref));
                } else {
                    batch.delete(doc(db, 'transactions', id));
                }

                const jq = query(
                    collection(db, 'journal'),
                    where('uid', '==', user.uid),
                    where('batchId', '==', existingBatchId || id)
                );
                const oldJournal = await getDocs(jq);
                oldJournal.forEach((d) => batch.delete(d.ref));
            }

            // SELF expense (personal, only user)
            if (participants.length === 1 && participants.includes(user.uid)) {
                const newRef = doc(collection(db, 'transactions'));
                batch.set(newRef, {
                    description: sanitizedDescription,
                    originalAmount: numericAmount,
                    amount: numericAmount,
                    payerId: user.uid,
                    debtorId: 'SELF',
                    date: serverTimestamp(),
                    status: 'confirmed',
                    splitType: 'SELF',
                    batchId: newBatchId,
                    settleStatus: null,
                });

                const journalRef = doc(collection(db, 'journal'));
                batch.set(journalRef, {
                    uid: user.uid,
                    amount: numericAmount,
                    description: sanitizedDescription,
                    type: 'expense',
                    date: serverTimestamp(),
                    source: 'Fair Share',
                    batchId: newBatchId,
                });
            } else if (splitMode === 'equal') {
                // EQUAL split
                const splitAmount = numericAmount / participants.length;

                participants.forEach((pId) => {
                    if (pId === user.uid) return;
                    const newRef = doc(collection(db, 'transactions'));
                    batch.set(newRef, {
                        description: sanitizedDescription,
                        originalAmount: numericAmount,
                        amount: parseFloat(splitAmount.toFixed(2)),
                        payerId: user.uid,
                        debtorId: pId,
                        date: serverTimestamp(),
                        status: 'pending',
                        splitType: 'EQUAL',
                        batchId: newBatchId,
                        settleStatus: null,
                    });
                });

                const payerShare = participants.includes(user.uid)
                    ? parseFloat(splitAmount.toFixed(2))
                    : 0;

                if (payerShare > 0) {
                    const journalRef = doc(collection(db, 'journal'));
                    batch.set(journalRef, {
                        uid: user.uid,
                        amount: payerShare,
                        description: sanitizedDescription,
                        type: 'expense',
                        date: serverTimestamp(),
                        source: 'Fair Share',
                        batchId: newBatchId,
                    });
                }
            } else {
                // EXACT split
                participants.forEach((pId) => {
                    if (pId === user.uid) return;
                    const friendAmount = parseFloat(exactAmounts[pId]) || 0;
                    if (friendAmount <= 0) return;

                    const newRef = doc(collection(db, 'transactions'));
                    batch.set(newRef, {
                        description: sanitizedDescription,
                        originalAmount: numericAmount,
                        amount: parseFloat(friendAmount.toFixed(2)),
                        payerId: user.uid,
                        debtorId: pId,
                        date: serverTimestamp(),
                        status: 'pending',
                        splitType: 'EXACT',
                        batchId: newBatchId,
                        settleStatus: null,
                    });
                });

                const payerShare = parseFloat(exactAmounts[user.uid]) || 0;
                if (payerShare > 0) {
                    const journalRef = doc(collection(db, 'journal'));
                    batch.set(journalRef, {
                        uid: user.uid,
                        amount: parseFloat(payerShare.toFixed(2)),
                        description: sanitizedDescription,
                        type: 'expense',
                        date: serverTimestamp(),
                        source: 'Fair Share',
                        batchId: newBatchId,
                    });
                }
            }

            setLoading(false);
            setAmount('');
            setDescription('');
            setParticipants([user.uid]);
            setSplitMode('equal');
            setExactAmounts({});

            navigate('/split');

            batch.commit().catch(err => {
                console.error("Critical: Background commit failed:", err);
            });

        } catch (error) {
            console.error('Error saving expense:', error);
            let errorMessage = "Failed to save expense. Please check your connection and try again.";

            if (error.code === 'permission-denied') {
                errorMessage = "You don't have permission to perform this action.";
            }

            showAlert({
                title: "Couldn't save",
                message: errorMessage,
                type: "danger"
            });
            setLoading(false);
        }
    };

    const showSplitToggle = participants.length > 1;

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6 flex flex-col items-center justify-center min-h-[80vh]">
            <Card padding="xl" className="w-full max-w-lg">
                <PageHeader
                    title={isEditing ? 'Edit Expense' : 'New Expense'}
                    subtitle="Fair Share details"
                    icon={FiDollarSign}
                    onBack={true}
                />

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input
                        label="For what?"
                        type="text"
                        placeholder="e.g. Saturday Dinner, Uber..."
                        value={description}
                        setValue={setDescription}
                    />

                    <Input
                        label="Total Bill"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        setValue={setAmount}
                        prefix="Rs."
                        className="text-lg font-bold"
                    />

                    <div>
                        <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 ml-1">
                            Fair Share with
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowFriendSelector(!showFriendSelector)}
                            className={`w-full flex justify-between items-center p-3.5 rounded-xl border transition-all ${showFriendSelector
                                ? 'bg-[var(--color-primary-light)] border-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                                : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-[var(--color-surface)] rounded-lg shadow-sm">
                                    <FiUsers className={showFriendSelector ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} size={16} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold">
                                        {participants.length === 1 ? 'Just Me' : `${participants.length} People`}
                                    </p>
                                    <p className="text-xs opacity-70">
                                        {participants.length === 1
                                            ? 'Personal Expense'
                                            : splitMode === 'equal'
                                                ? 'Fair Share Equally'
                                                : 'Exact Amounts'}
                                    </p>
                                </div>
                            </div>
                            {showFriendSelector ? <FiChevronUp /> : <FiChevronDown />}
                        </button>

                        {showFriendSelector && (
                            <div className="mt-2 bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-2xl shadow-xl overflow-hidden animate-fade-in-up flex flex-col">
                                <div className="p-3 border-b border-[var(--color-border-light)] sticky top-0 bg-[var(--color-surface)] z-10">
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search friends..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-[var(--color-surface-hover)] border-none rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary-subtle)] transition-all outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="p-2 max-h-56 overflow-y-auto space-y-1 relative">
                                    {(!searchTerm || 'you (payer)'.includes(searchTerm.toLowerCase())) && (
                                        <div className="flex items-center justify-between p-3 bg-[var(--color-surface-alt)] rounded-xl opacity-60">
                                            <div className="flex items-center gap-3">
                                                <Avatar name="You" size="sm" />
                                                <span className="font-bold text-sm text-[var(--color-text-secondary)]">You (Payer)</span>
                                            </div>
                                            <FiCheck className="text-[var(--color-primary)]" />
                                        </div>
                                    )}

                                    {friends.length > 0 ? (
                                        friends
                                            .filter(f => f.username.toLowerCase().includes(searchTerm.toLowerCase()) || f.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((friend) => {
                                                const isSelected = participants.includes(friend.uid);
                                                return (
                                                    <div
                                                        key={friend.uid}
                                                        onClick={() => toggleParticipant(friend.uid)}
                                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected
                                                            ? 'bg-[var(--color-primary-light)] border border-[var(--color-primary-subtle)]'
                                                            : 'hover:bg-[var(--color-surface-hover)] border border-transparent'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Avatar name={friend.username} size="sm" className={isSelected ? '' : 'opacity-60'} />
                                                            <div>
                                                                <span className={`text-sm font-bold ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                                                                    {friend.username}
                                                                </span>
                                                                <p className="text-xs text-[var(--color-text-muted)]">{friend.email}</p>
                                                            </div>
                                                        </div>
                                                        {isSelected && <FiCheck className="text-[var(--color-primary)]" />}
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <p className="p-4 text-xs text-[var(--color-text-muted)] text-center">No friends added yet.</p>
                                    )}
                                    {friends.length > 0 && searchTerm && friends.filter(f => f.username.toLowerCase().includes(searchTerm.toLowerCase()) || f.email.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                        <p className="p-4 text-xs text-[var(--color-text-muted)] text-center">No friends found for "{searchTerm}".</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Split Mode Toggle */}
                    {showSplitToggle && (
                        <div>
                            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 ml-1">
                                Split Method
                            </label>
                            <div className="flex bg-[var(--color-surface-alt)] rounded-xl p-1 border border-[var(--color-border)]">
                                <button
                                    type="button"
                                    onClick={() => handleSplitModeChange('equal')}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${splitMode === 'equal'
                                        ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                        }`}
                                >
                                    Split Equally
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSplitModeChange('exact')}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${splitMode === 'exact'
                                        ? 'bg-[var(--color-warning)] text-white shadow-md shadow-[var(--color-warning)]/30'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                        }`}
                                >
                                    Exact Amounts
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Exact Amount Inputs */}
                    {splitMode === 'exact' && showSplitToggle && (
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1">
                                Enter each person's share
                            </label>

                            <div className="space-y-2">
                                {/* Payer's share */}
                                <div className="flex items-center gap-3 p-3 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                    <Avatar name="You" size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[var(--color-text)] truncate">You (Payer)</p>
                                    </div>
                                    <div className="relative w-28 shrink-0">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] font-bold">Rs.</span>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            min="0"
                                            value={exactAmounts[user?.uid] || ''}
                                            onChange={(e) => updateExactAmount(user.uid, e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-9 pr-2 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm font-bold text-right text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary-subtle)] focus:border-[var(--color-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)]"
                                        />
                                    </div>
                                </div>

                                {/* Friends' shares */}
                                {participants.filter(pId => pId !== user?.uid).map(pId => {
                                    const friendName = getFriendName(pId);
                                    return (
                                        <div key={pId} className="flex items-center gap-3 p-3 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                            <Avatar name={friendName} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[var(--color-text)] truncate">{friendName}</p>
                                            </div>
                                            <div className="relative w-28 shrink-0">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] font-bold">Rs.</span>
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.01"
                                                    min="0"
                                                    value={exactAmounts[pId] || ''}
                                                    onChange={(e) => updateExactAmount(pId, e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-9 pr-2 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm font-bold text-right text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary-subtle)] focus:border-[var(--color-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)]"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Running total bar */}
                            {numericAmount > 0 && (
                                <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isExactValid
                                    ? 'bg-[var(--color-success-light)] border-[var(--color-success)]/30'
                                    : 'bg-[var(--color-danger-light)] border-[var(--color-danger)]/30'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        {isExactValid ? (
                                            <FiCheck className="text-[var(--color-success)]" size={16} />
                                        ) : (
                                            <FiAlertCircle className="text-[var(--color-danger)]" size={16} />
                                        )}
                                        <span className={`text-xs font-bold ${isExactValid ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                                            {isExactValid ? 'Amounts match!' : exactDiff > 0 ? `Rs. ${exactDiff.toFixed(2)} remaining` : `Rs. ${Math.abs(exactDiff).toFixed(2)} over`}
                                        </span>
                                    </div>
                                    <span className={`text-sm font-bold ${isExactValid ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                                        Rs. {exactTotal.toFixed(2)} / {numericAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary Card (Equal Mode) */}
                    {splitMode === 'equal' && amount && participants.length > 0 && (
                        <Card className="bg-[var(--color-surface-alt)] border-[var(--color-border)]" padding="sm">
                            <p className="text-xs text-[var(--color-text-muted)] uppercase font-bold tracking-widest mb-2 text-center">Summary</p>
                            <div className="flex justify-between items-center text-sm">
                                <div className="text-center flex-1 border-r border-[var(--color-border)] pr-3">
                                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Per Person</p>
                                    <p className="font-bold text-[var(--color-text)] text-lg">
                                        Rs. {(amount / participants.length).toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-center flex-1 pl-3">
                                    <p className="text-xs text-[var(--color-text-muted)] mb-1">You receive</p>
                                    <p className="font-bold text-[var(--color-success)] text-lg">
                                        + Rs. {(amount - amount / participants.length).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Summary Card (Exact Mode) */}
                    {splitMode === 'exact' && showSplitToggle && numericAmount > 0 && isExactValid && (
                        <Card className="bg-[var(--color-surface-alt)] border-[var(--color-border)]" padding="sm">
                            <p className="text-xs text-[var(--color-text-muted)] uppercase font-bold tracking-widest mb-2 text-center">Summary</p>
                            <div className="flex justify-between items-center text-sm">
                                <div className="text-center flex-1 border-r border-[var(--color-border)] pr-3">
                                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Your share</p>
                                    <p className="font-bold text-[var(--color-text)] text-lg">
                                        Rs. {(parseFloat(exactAmounts[user?.uid]) || 0).toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-center flex-1 pl-3">
                                    <p className="text-xs text-[var(--color-text-muted)] mb-1">You receive</p>
                                    <p className="font-bold text-[var(--color-success)] text-lg">
                                        + Rs. {(numericAmount - (parseFloat(exactAmounts[user?.uid]) || 0)).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    <Button
                        type="submit"
                        text={loading ? 'Processing...' : isEditing ? 'Update Expense' : 'Save Expense'}
                        loading={loading}
                        fullWidth
                        size="lg"
                    />
                </form>
            </Card>
        </div>
    );
};

export default AddExpense;