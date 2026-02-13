import React, { useState } from "react";
import Input from "../../components/Input";
import Heading from "../../components/Heading";
import Already from "../../components/Already";
import Button from "../../components/Button";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../services/firebase";
import { FiTrendingUp, FiShield, FiArrowLeft } from "react-icons/fi";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    
    const [isResetMode, setIsResetMode] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            if (!email || !password) {
                alert("Please fill in all fields.");
                setLoading(false);
                return;
            }
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.log("Error: ", error);
            alert("Login failed. Check your email or password.");
        }
        setLoading(false);
    };

    const handlePasswordReset = async () => {
        if (!email) {
            alert("Please enter your email address first.");
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Password reset link sent! Check your inbox.");
            setIsResetMode(false);
        } catch (error) {
            console.error("Reset Error:", error);
            alert("Failed to send reset email. Please check the email address.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
                <div className="hidden md:flex md:w-1/2 bg-blue-600 p-12 flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 opacity-20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-600 opacity-20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-md">
                                K
                            </div>
                            <span className="text-2xl font-bold tracking-tight">
                                King!
                            </span>
                        </div>

                        <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-6">
                            Welcome Back!
                        </h2>
                        <p className="text-blue-100 text-lg mb-8">
                            Log in to track your expenses, settle debts, and manage shared
                            costs with friends instantly.
                        </p>

                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                                    <FiTrendingUp size={20} />
                                </div>
                                <span className="font-medium">See your spending habits</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                                    <FiShield size={20} />
                                </div>
                                <span className="font-medium">Secure and private data</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-12">
                        <p className="text-sm text-blue-200 font-medium">
                            "The best way to split bills without the awkwardness."
                        </p>
                    </div>
                </div>

                <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-white">
                    <div className="md:hidden flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                            K
                        </div>
                        <span className="text-xl font-bold text-gray-800 tracking-tight">
                            King!
                        </span>
                    </div>

                    <div className="max-w-sm mx-auto w-full">
                        {!isResetMode ? (
                            <>
                                <div className="mb-8">
                                    <Heading
                                        headingText="Sign In"
                                        text="Please enter your details to continue."
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Input
                                        type="email"
                                        value={email}
                                        placeholder="Email address"
                                        setValue={setEmail}
                                        className="bg-gray-50 focus:bg-white"
                                    />
                                    <div className="space-y-1">
                                        <Input
                                            type="password"
                                            value={password}
                                            placeholder="Password"
                                            setValue={setPassword}
                                            className="bg-gray-50 focus:bg-white"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setIsResetMode(true)}
                                                className="text-xs font-medium text-blue-600 hover:underline transition-colors"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            text={loading ? "Logging in..." : "Login"}
                                            onClick={handleLogin}
                                            disabled={loading}
                                            className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-xl font-bold shadow-lg shadow-blue-200"
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 text-center">
                                    <Already
                                        text="Don't have an account yet?"
                                        linkText="Register"
                                        link="/register"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-8">
                                    <Heading
                                        headingText="Reset Password"
                                        text="Enter your email and we'll send you a link to reset your password."
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Input
                                        type="email"
                                        value={email}
                                        placeholder="Enter your email address"
                                        setValue={setEmail}
                                        className="bg-gray-50 focus:bg-white"
                                    />

                                    <div className="pt-2">
                                        <Button
                                            text={loading ? "Sending..." : "Send Reset Link"}
                                            onClick={handlePasswordReset}
                                            disabled={loading}
                                            className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-xl font-bold shadow-lg shadow-blue-200"
                                        />
                                    </div>

                                    <button
                                        onClick={() => setIsResetMode(false)}
                                        className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FiArrowLeft /> Back to Login
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;