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
    FiTrash2,
    FiLock,
    FiAlertTriangle,
    FiMessageSquare,
} from 'react-icons/fi';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import Card from './Card';
import Button from './Button';
import Input from './Input';
import Avatar from './Avatar';
import PageHeader from './PageHeader';
import Spinner from './Spinner';
import Modal from './Modal';
import useAlert from '../hooks/useAlert';
import { deleteAccount, checkUnsettledTransactions } from '../services/authService';

const Profile = () => {
    const { user } = useContext(AuthContext);
    const { showAlert, showConfirm } = useAlert();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [checkingDelete, setCheckingDelete] = useState(false);

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
        if (!newName.trim()) return showAlert({ title: "Name can't be blank", message: "Name cannot be empty", type: "warning" });
        setSaving(true);

        try {
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: newName });
            }

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { username: newName });

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
            showAlert({ title: "Couldn't save", message: "Something went wrong updating your profile.", type: "danger" });
        }
        setSaving(false);
    };

    const handleLogout = () => {
        showConfirm({
            title: "Log Out",
            message: "Are you sure you want to log out?",
            confirmText: "Log Out",
            onConfirm: async () => {
                await signOut(auth);
                navigate('/login');
            }
        });
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword.trim()) {
            showAlert({ title: 'Password Required', message: 'Please enter your password to confirm.', type: 'warning' });
            return;
        }
        setDeleting(true);
        const result = await deleteAccount(deletePassword);
        setDeleting(false);

        if (result.success) {
            setShowDeleteModal(false);
            setDeletePassword('');
            navigate('/login');
        } else {
            showAlert({ title: 'Deletion Failed', message: result.error, type: 'danger' });
        }
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
                        <div className="lg:hidden pt-1">
                            <Button
                                text="Log Out"
                                icon={FiLogOut}
                                variant="secondary"
                                size="sm"
                                fullWidth
                                onClick={handleLogout}
                            />
                        </div>
                    </div>
                </Card>
                {/* Send Feedback */}
                <Card padding="sm" className="md:!p-4 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors" onClick={() => navigate('/feedback')}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-lg">
                                <FiMessageSquare size={14} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[var(--color-text)]">Send Feedback</h3>
                                <p className="text-[10px] text-[var(--color-text-muted)]">Report bugs, request features</p>
                            </div>
                        </div>
                        <span className="text-[var(--color-text-muted)] text-lg">›</span>
                    </div>
                </Card>

                {/* Danger Zone */}
                <Card padding="sm" className="ring-1 ring-inset ring-[var(--color-danger)]/30 md:!p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-[var(--color-danger-light)] text-[var(--color-danger)] rounded-lg">
                            <FiAlertTriangle size={14} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-[var(--color-danger)]">Danger Zone</h3>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Irreversible actions</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
                        Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button
                        text="Delete Account"
                        icon={FiTrash2}
                        variant="danger"
                        size="sm"
                        fullWidth
                        loading={checkingDelete}
                        onClick={async () => {
                            setCheckingDelete(true);
                            try {
                                const result = await checkUnsettledTransactions();
                                if (!result.canDelete) {
                                    showAlert({
                                        title: 'Unsettled Transactions',
                                        message: `You have ${result.count} unsettled split transaction${result.count > 1 ? 's' : ''}. Please settle all transactions before deleting your account.`,
                                        type: 'warning',
                                    });
                                } else {
                                    setShowDeleteModal(true);
                                }
                            } catch (err) {
                                console.error('Error checking transactions:', err);
                                showAlert({ title: 'Error', message: 'Could not verify your transactions. Please try again.', type: 'danger' });
                            }
                            setCheckingDelete(false);
                        }}
                    />
                </Card>
            </div>

            {/* Delete Account Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => { if (!deleting) { setShowDeleteModal(false); setDeletePassword(''); } }}
                title="Delete Account"
                icon={FiTrash2}
                headerClassName="bg-[var(--color-danger-light)] border-[var(--color-danger)]/20"
                footer={
                    <div className="flex gap-3">
                        <Button
                            text="Cancel"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                            disabled={deleting}
                        />
                        <Button
                            text="Delete Forever"
                            icon={FiTrash2}
                            variant="danger"
                            className="flex-1"
                            onClick={handleDeleteAccount}
                            loading={deleting}
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-[var(--color-danger-light)] text-[var(--color-danger)]">
                            <FiAlertTriangle size={32} />
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            This will permanently delete your account, all your data, and remove you from shared expenses. This cannot be undone.
                        </p>
                    </div>
                    <Input
                        type="password"
                        value={deletePassword}
                        setValue={setDeletePassword}
                        placeholder="Enter your password"
                        label="Confirm Password"
                        icon={FiLock}
                        disabled={deleting}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default Profile;
