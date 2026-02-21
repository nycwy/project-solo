import { useState, useContext, useEffect } from 'react';
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
} from 'react-icons/fi';

import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';

const AddExpense = () => {
    const { user } = useContext(AuthContext);
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
                    alert('Expense not found');
                    navigate('/');
                    return;
                }

                const data = mainDoc.data();
                if (data.payerId !== user.uid) {
                    alert('You can only edit expenses you created.');
                    navigate('/');
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
                    batchSnap.forEach((doc) => {
                        const t = doc.data();
                        if (t.debtorId !== 'SELF') foundParticipants.add(t.debtorId);
                    });
                    setParticipants(Array.from(foundParticipants));
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
    }, [id, user, navigate]);

    const toggleParticipant = (friendId) => {
        setParticipants((prev) =>
            prev.includes(friendId) ? prev.filter((p) => p !== friendId) : [...prev, friendId]
        );
        setSearchTerm('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const numericAmount = parseFloat(amount);
            if (isNaN(numericAmount) || numericAmount <= 0) throw new Error('Invalid amount');
            if (participants.length === 0) throw new Error('Select at least one person.');

            const splitAmount = numericAmount / participants.length;
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

                // Clean up old auto-journal entry for this batch
                const jq = query(
                    collection(db, 'journal'),
                    where('uid', '==', user.uid),
                    where('batchId', '==', existingBatchId || id)
                );
                const oldJournal = await getDocs(jq);
                oldJournal.forEach((d) => batch.delete(d.ref));
            }

            // Payer's own share for journal
            const payerShare = participants.includes(user.uid)
                ? parseFloat(splitAmount.toFixed(2))
                : 0;

            if (participants.length === 1 && participants.includes(user.uid)) {
                const newRef = doc(collection(db, 'transactions'));
                batch.set(newRef, {
                    description,
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

                // Self expense → record full amount to journal
                const journalRef = doc(collection(db, 'journal'));
                batch.set(journalRef, {
                    uid: user.uid,
                    amount: numericAmount,
                    description,
                    type: 'expense',
                    date: serverTimestamp(),
                    source: 'splitter',
                    batchId: newBatchId,
                });
            } else {
                participants.forEach((pId) => {
                    if (pId === user.uid) return;
                    const newRef = doc(collection(db, 'transactions'));
                    batch.set(newRef, {
                        description,
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

                // Record payer's own share to journal
                if (payerShare > 0) {
                    const journalRef = doc(collection(db, 'journal'));
                    batch.set(journalRef, {
                        uid: user.uid,
                        amount: payerShare,
                        description,
                        type: 'expense',
                        date: serverTimestamp(),
                        source: 'splitter',
                        batchId: newBatchId,
                    });
                }
            }

            await batch.commit();

            // Redirect to the split page when done
            navigate('/split');
        } catch (error) {
            console.error('Error saving expense:', error);
            alert(error.message || 'Failed to save');
        }
        setLoading(false);
    };

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6 flex flex-col items-center justify-center min-h-[80vh]">
            <Card padding="xl" className="w-full max-w-lg">
                <PageHeader
                    title={isEditing ? 'Edit Expense' : 'New Expense'}
                    subtitle="Enter details below"
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

                    {/* Friend Selector */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 ml-1">
                            Split with
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
                                        {participants.length === 1 ? 'Personal Expense' : 'Split Equally'}
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
                                    {/* You */}
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

                    {/* Summary */}
                    {amount && participants.length > 0 && (
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
