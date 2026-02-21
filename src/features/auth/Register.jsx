import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { auth, db } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

import Button from '../../components/Button';
import Input from '../../components/Input';
import Heading from '../../components/Heading';
import Already from '../../components/Already';
import Card from '../../components/Card';

const Register = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (user) {
        navigate('/journal');
        return null;
    }

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!username.trim()) {
            setError('Please enter your name');
            setLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            await updateProfile(newUser, { displayName: username });

            await setDoc(doc(db, 'users', newUser.uid), {
                username,
                email,
                createdAt: serverTimestamp(),
                friendsList: [],
            });

            navigate('/journal');
        } catch (err) {
            setError(
                err.code === 'auth/email-already-in-use'
                    ? 'An account with this email already exists'
                    : err.code === 'auth/weak-password'
                        ? 'Password should be at least 6 characters'
                        : 'Registration failed. Please try again.'
            );
        }
        setLoading(false);
    };

    return (
        <div className="min-h-[100dvh] w-full bg-[var(--color-bg)] flex flex-col items-center pt-[15dvh] sm:justify-center sm:pt-0 p-4 relative overflow-hidden">
            {/* Decorative gradient blobs */}
            <div className="absolute top-[-20%] right-[-10%] w-[120vw] h-[120vw] max-w-[500px] max-h-[500px] bg-[var(--color-primary)] opacity-[0.07] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[100vw] h-[100vw] max-w-[400px] max-h-[400px] bg-[var(--color-primary)] opacity-[0.05] rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-6">
                    <Heading headingText="Create Account" text="Sign up to get started" />
                </div>

                <Card padding="md" className="shadow-[0_8px_32px_var(--color-shadow-lg)] border-[var(--color-border-light)]">
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 rounded-xl text-sm text-[var(--color-danger)] font-medium">
                                {error}
                            </div>
                        )}

                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                            value={username}
                            setValue={setUsername}
                            icon={FiUser}
                        />

                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            setValue={setEmail}
                            icon={FiMail}
                        />

                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Min. 6 characters"
                                value={password}
                                setValue={setPassword}
                                icon={FiLock}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-8 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                            >
                                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            text="Create Account"
                            loading={loading}
                            fullWidth
                            size="lg"
                        />
                    </form>
                </Card>

                <Already
                    text="Already have an account?"
                    link="/login"
                    linkText="Sign In"
                    className="mt-4"
                />
            </div>
        </div>
    );
};

export default Register;
