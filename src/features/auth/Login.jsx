import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../services/firebase';
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

import Button from '../../components/Button';
import Input from '../../components/Input';
import Heading from '../../components/Heading';
import Already from '../../components/Already';
import Card from '../../components/Card';
import Footer from '../../components/Footer';

const Login = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (user) {
        navigate('/journal');
        return null;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/journal');
        } catch (err) {
            setError(
                err.code === 'auth/user-not-found'
                    ? 'No account found with this email'
                    : err.code === 'auth/wrong-password'
                        ? 'Incorrect password'
                        : 'Login failed. Please try again.'
            );
        }
        setLoading(false);
    };

    const handleReset = async () => {
        if (!email) return alert('Enter your email first');
        try {
            await sendPasswordResetEmail(auth, email);
            alert('Password reset email sent!');
        } catch (err) {
            alert('Failed to send reset email');
        }
    };

    return (
        <div className="min-h-[100dvh] w-full bg-[var(--color-bg)] flex flex-col items-center pt-[15dvh] sm:justify-center sm:pt-0 p-4 relative overflow-hidden">
            {/* Decorative gradient blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[120vw] h-[120vw] max-w-[500px] max-h-[500px] bg-[var(--color-primary)] opacity-[0.07] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[100vw] h-[100vw] max-w-[400px] max-h-[400px] bg-[var(--color-primary)] opacity-[0.05] rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-6">
                    <Heading headingText="Welcome Back" text="Sign in to your account" />
                </div>

                <Card padding="md" className="shadow-[0_8px_32px_var(--color-shadow-lg)] border-[var(--color-border-light)]">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 rounded-xl text-sm text-[var(--color-danger)] font-medium">
                                {error}
                            </div>
                        )}

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
                                placeholder="••••••••"
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

                        <div className="text-right">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="text-xs text-[var(--color-primary)] font-semibold hover:underline"
                            >
                                Forgot password?
                            </button>
                        </div>

                        <Button
                            type="submit"
                            text="Sign In"
                            loading={loading}
                            fullWidth
                            size="lg"
                        />
                    </form>
                </Card>

                <Already
                    text="Don't have an account?"
                    link="/register"
                    linkText="Sign Up"
                    className="mt-4"
                />

                <div className="mt-8">
                    <Footer />
                </div>
            </div>
        </div>
    );
};

export default Login;