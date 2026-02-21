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
    arrayRemove,
    addDoc,
    serverTimestamp,
    getDocs,
    getDoc,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
    FiUsers,
    FiSearch,
    FiUserPlus,
    FiUserX,
    FiCheck,
    FiX,
    FiChevronRight,
    FiMail,
    FiSend,
} from 'react-icons/fi';

import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';

const Friends = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [showAddFriend, setShowAddFriend] = useState(false);
    const [friendEmail, setFriendEmail] = useState('');
    const [addLoading, setAddLoading] = useState('');

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setFriends(docSnap.data().friendsList || []);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'friend_requests'),
            where('toId', '==', user.uid),
            where('status', '==', 'pending')
        );
        const unsub = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'friend_requests'),
            where('fromId', '==', user.uid),
            where('status', '==', 'pending')
        );
        const unsub = onSnapshot(q, async (snap) => {
            const requestsData = await Promise.all(
                snap.docs.map(async (d) => {
                    const data = d.data();
                    let toName = data.toName;
                    let toEmail = data.toEmail;

                    if (!toName && data.toId) {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', data.toId));
                            if (userDoc.exists()) {
                                toName = userDoc.data().username || userDoc.data().email;
                                toEmail = userDoc.data().email;
                            }
                        } catch (err) {
                            console.error("Error fetching user detail:", err);
                        }
                    }

                    return { id: d.id, ...data, toName, toEmail };
                })
            );
            setSentRequests(requestsData);
        });
        return () => unsub();
    }, [user]);

    const handleAccept = async (req) => {
        try {
            const myName = user.displayName || user.email;
            await updateDoc(doc(db, 'users', user.uid), {
                friendsList: arrayUnion({
                    uid: req.fromId,
                    username: req.fromName,
                    email: req.fromEmail,
                }),
            });
            await updateDoc(doc(db, 'users', req.fromId), {
                friendsList: arrayUnion({
                    uid: user.uid,
                    username: myName,
                    email: user.email,
                }),
            });
            await deleteDoc(doc(db, 'friend_requests', req.id));
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const handleDecline = async (req) => {
        await deleteDoc(doc(db, 'friend_requests', req.id));
    };

    const handleUnfriend = async (friend) => {
        if (!window.confirm(`Remove ${friend.username} from friends?`)) return;

        const q1 = query(
            collection(db, 'transactions'),
            where('payerId', '==', user.uid),
            where('debtorId', '==', friend.uid)
        );
        const q2 = query(
            collection(db, 'transactions'),
            where('payerId', '==', friend.uid),
            where('debtorId', '==', user.uid)
        );
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const allTxns = [...snap1.docs.map((d) => d.data()), ...snap2.docs.map((d) => d.data())];
        const hasUnsettled = allTxns.some((t) => t.settleStatus !== 'settled');

        if (hasUnsettled) {
            alert(`Cannot remove ${friend.username}. There are outstanding debts.`);
            return;
        }

        await updateDoc(doc(db, 'users', user.uid), {
            friendsList: arrayRemove(friend),
        });
        await updateDoc(doc(db, 'users', friend.uid), {
            friendsList: arrayRemove({
                uid: user.uid,
                username: user.displayName || user.email,
                email: user.email,
            }),
        });
    };

    const handleSendRequest = async () => {
        if (!friendEmail.trim()) return alert('Enter an email address');
        if (friendEmail.trim() === user.email) return alert("That's your own email!");

        setAddLoading(true);
        try {
            const usersQuery = query(
                collection(db, 'users'),
                where('email', '==', friendEmail.trim())
            );
            const usersSnap = await getDocs(usersQuery);
            if (usersSnap.empty) {
                alert('No user found with this email');
                setAddLoading(false);
                return;
            }

            const friendDoc = usersSnap.docs[0];
            const friendId = friendDoc.id;

            if (friends.some((f) => f.uid === friendId)) {
                alert('Already friends!');
                setAddLoading(false);
                return;
            }

            const reqQuery = query(
                collection(db, 'friend_requests'),
                where('fromId', '==', user.uid),
                where('toId', '==', friendId),
                where('status', '==', 'pending')
            );
            const reqSnap = await getDocs(reqQuery);
            if (!reqSnap.empty) {
                alert('Request already sent!');
                setAddLoading(false);
                return;
            }

            const myName = user.displayName || user.email;
            await addDoc(collection(db, 'friend_requests'), {
                fromId: user.uid,
                fromName: myName,
                fromEmail: user.email,
                toId: friendId,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            setFriendEmail('');
            setShowAddFriend(false);
            alert(`Request sent to ${friendDoc.data().username || friendEmail}!`);
        } catch (error) {
            console.error('Error sending request:', error);
            alert('Failed to send request');
        }
        setAddLoading(false);
    };

    const filteredFriends = friends.filter((f) =>
        f.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                title="Friends"
                subtitle={`${friends.length} friend${friends.length !== 1 ? 's' : ''}`}
                icon={FiUsers}
                rightContent={
                    <Button
                        text="Add Friend"
                        icon={FiUserPlus}
                        size="sm"
                        onClick={() => setShowAddFriend(!showAddFriend)}
                    />
                }
            />

            {showAddFriend && (
                <Card className="mb-4 animate-fade-in-up">
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            placeholder="Enter friend's email"
                            value={friendEmail}
                            setValue={setFriendEmail}
                            icon={FiMail}
                            className="flex-1"
                            autoFocus
                        />
                        <Button
                            icon={FiSend}
                            variant="primary"
                            onClick={handleSendRequest}
                            loading={addLoading}
                        />
                    </div>
                </Card>
            )}

            {requests.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 ml-1">
                        Pending Requests ({requests.length})
                    </h3>
                    <div className="space-y-2">
                        {requests.map((req) => (
                            <Card key={req.id} padding="sm" className="animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={req.fromName} size="sm" />
                                        <div>
                                            <p className="text-sm font-bold text-[var(--color-text)]">{req.fromName}</p>
                                            <p className="text-xs text-[var(--color-text-muted)]">{req.fromEmail}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleAccept(req)}
                                            className="p-2 rounded-xl bg-[var(--color-success-light)] text-[var(--color-success)] hover:opacity-80 transition-all"
                                        >
                                            <FiCheck size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDecline(req)}
                                            className="p-2 rounded-xl bg-[var(--color-danger-light)] text-[var(--color-danger)] hover:opacity-80 transition-all"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {sentRequests.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 ml-1">
                        Sent Requests ({sentRequests.length})
                    </h3>
                    <div className="space-y-2">
                        {sentRequests.map((req) => (
                            <Card key={req.id} padding="sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={req.toName || req.toEmail || "User"} size="sm" />
                                        <p className="text-sm text-[var(--color-text-secondary)]">Request sent to <span className="font-bold text-[var(--color-text)]">{req.toName || req.toEmail || "User"}</span></p>
                                    </div>
                                    <Badge variant="pending">Pending</Badge>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {friends.length > 0 && (
                <div className="mb-4">
                    <Input
                        type="text"
                        placeholder="Search friends..."
                        value={searchTerm}
                        setValue={setSearchTerm}
                        icon={FiSearch}
                    />
                </div>
            )}

            {filteredFriends.length === 0 && friends.length === 0 ? (
                <EmptyState
                    icon={FiUsers}
                    title="No friends yet"
                    subtitle="Add friends to start splitting expenses"
                    actionText="Add Friend"
                    onAction={() => setShowAddFriend(true)}
                />
            ) : filteredFriends.length === 0 ? (
                <EmptyState
                    icon={FiSearch}
                    title="No results"
                    subtitle={`No friends matching "${searchTerm}"`}
                />
            ) : (
                <div className="space-y-2">
                    {filteredFriends.map((friend) => (
                        <Card key={friend.uid} padding="sm" hover onClick={() => navigate(`/friend/${friend.uid}`)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar name={friend.username} size="md" />
                                    <div>
                                        <p className="text-sm font-bold text-[var(--color-text)]">{friend.username}</p>
                                        <p className="text-xs text-[var(--color-text-muted)]">{friend.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnfriend(friend);
                                        }}
                                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-all"
                                    >
                                        <FiUserX size={14} />
                                    </button>
                                    <FiChevronRight size={16} className="text-[var(--color-text-muted)]" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Friends;
