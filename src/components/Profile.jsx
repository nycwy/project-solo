import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { auth, db } from '../services/firebase';
import { updateProfile } from 'firebase/auth';
import {
    doc,
    updateDoc,
    onSnapshot,
    getDoc,
} from 'firebase/firestore';
import {
    FiEdit2,
    FiSave,
    FiX,
    FiLogOut,
    FiMail,
    FiUser,
} from 'react-icons/fi';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import Card from './Card';
import Button from './Button';
import Input from './Input';
import Avatar from './Avatar';
import PageHeader from './PageHeader';
import Spinner from './Spinner';

const Profile = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) {
                setUserData(snap.data());
                setNewName(snap.data().username || '');
            }
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const handleUpdateProfile = async () => {
        if (!newName.trim()) return alert('Name cannot be empty');
        setSaving(true);

        try {
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: newName });
            }

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { username: newName });

            // Update name in friends' lists
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const friendsList = userDoc.data().friendsList || [];
                for (const friend of friendsList) {
                    const friendRef = doc(db, 'users', friend.uid);
                    const friendDoc = await getDoc(friendRef);
                    if (friendDoc.exists()) {
                        const friendFriendsList = friendDoc.data().friendsList || [];
                        const updatedList = friendFriendsList.map((f) =>
                            f.uid === user.uid ? { ...f, username: newName } : f
                        );
                        await updateDoc(friendRef, { friendsList: updatedList });
                    }
                }
            }

            setEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        }
        setSaving(false);
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    const displayName = userData?.username || user?.displayName || 'User';

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
            <PageHeader title="Profile" subtitle="Manage your account" icon={FiUser} />

            <div className="max-w-md w-full mx-auto space-y-4">
                {/* Avatar + Name Card */}
                <Card padding="lg" className="text-center">
                    <div className="flex flex-col items-center">
                        <Avatar name={displayName} photoURL={user?.photoURL} size="2xl" className="mb-4" />

                        {editing ? (
                            <div className="w-full space-y-3">
                                <Input
                                    type="text"
                                    value={newName}
                                    setValue={setNewName}
                                    placeholder="Enter new name"
                                    autoFocus
                                />
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                    <Button
                                        text="Save"
                                        icon={FiSave}
                                        onClick={handleUpdateProfile}
                                        loading={saving}
                                        fullWidth
                                        variant="success"
                                    />
                                    <Button
                                        text="Cancel"
                                        icon={FiX}
                                        onClick={() => { setEditing(false); setNewName(displayName); }}
                                        variant="secondary"
                                        fullWidth
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-[var(--color-text)]">{displayName}</h2>
                                <p className="text-sm text-[var(--color-text-muted)] mt-1">{user?.email}</p>
                                <Button
                                    text="Edit Name"
                                    icon={FiEdit2}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditing(true)}
                                    className="mt-3"
                                />
                            </>
                        )}
                    </div>
                </Card>

                {/* Info Card */}
                <Card>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-lg">
                                <FiMail size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">Email</p>
                                <p className="text-sm font-medium text-[var(--color-text-secondary)]">{user?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--color-success-light)] text-[var(--color-success)] rounded-lg">
                                <FiUser size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">Display Name</p>
                                <p className="text-sm font-medium text-[var(--color-text-secondary)]">{displayName}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Logout - visible on mobile (desktop has sidebar logout) */}
                <Card className="lg:hidden">
                    <Button
                        text="Log Out"
                        icon={FiLogOut}
                        variant="danger"
                        fullWidth
                        onClick={handleLogout}
                    />
                </Card>
            </div>
        </div>
    );
};

export default Profile;
