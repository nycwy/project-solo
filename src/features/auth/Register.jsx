import React, { useState } from "react";
import Input from "../../components/Input";
import Heading from "../../components/Heading";
import Button from "../../components/Button";
import Already from "../../components/Already";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../services/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FiPieChart, FiUsers, FiCheckCircle, FiActivity } from "react-icons/fi";

const Register = () => {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        setLoading(true);
        try {
            if (!email || !username || !password) {
                alert("Please fill all fields");
                setLoading(false);
                return;
            }
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password,
            );
            const userRef = doc(db, "users", userCredential.user.uid);
            await setDoc(userRef, {
                email,
                username,
                photoURL: "",
                total_owed: 0,
                total_debt: 0,
                friendsList: [],
                created_at: serverTimestamp(),
            });
        } catch (error) {
            console.log("Error: ", error);
            alert("Registration failed. " + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
                {/* 1. BRANDING SECTION (Desktop Only) */}
                <div className="hidden md:flex md:w-1/2 bg-blue-600 p-12 flex-col justify-between text-white relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-900 opacity-20 rounded-full translate-y-1/3 -translate-x-1/3 blur-xl"></div>

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
                            Stop worrying about who paid what.
                        </h2>
                        <p className="text-blue-100 text-lg mb-8">
                            Join thousands of users who trust King! to track shared
                            expenses for trips, roommates, and dinners.
                        </p>

                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                                    <FiPieChart size={20} />
                                </div>
                                <span className="font-medium">Track balances in real-time</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                                    <FiUsers size={20} />
                                </div>
                                <span className="font-medium">Split equally or customized</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                                    <FiCheckCircle size={20} />
                                </div>
                                <span className="font-medium">Settle debts easily</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-12">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3">
                                <div className="w-9 h-9 rounded-full bg-yellow-400 border-2 border-blue-600"></div>
                                <div className="w-9 h-9 rounded-full bg-green-400 border-2 border-blue-600"></div>
                                <div className="w-9 h-9 rounded-full bg-purple-400 border-2 border-blue-600"></div>
                            </div>
                            <p className="text-sm text-blue-200 font-medium ml-2">
                                Used by groups everywhere
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. FORM SECTION (Mobile + Desktop) */}
                <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-white">
                    {/* Mobile Branding (Visible only on small screens) */}
                    <div className="md:hidden flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                            K
                        </div>
                        <span className="text-xl font-bold text-gray-800 tracking-tight">
                            King!
                        </span>
                    </div>

                    <div className="max-w-sm mx-auto w-full">
                        <div className="mb-8">
                            <Heading
                                headingText="Create Account"
                                text="The awkward-free way to split bills."
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
                            <Input
                                type="text"
                                value={username}
                                placeholder="Full Name"
                                setValue={setUsername}
                                className="bg-gray-50 focus:bg-white"
                            />
                            <Input
                                type="password"
                                value={password}
                                placeholder="Password"
                                setValue={setPassword}
                                className="bg-gray-50 focus:bg-white"
                            />

                            <div className="pt-2">
                                <Button
                                    text={loading ? "Creating Account..." : "Sign Up"}
                                    onClick={handleRegister}
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-xl font-bold shadow-lg shadow-blue-200"
                                />
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <Already
                                text="Already have an account?"
                                linkText="Log in"
                                link="/login"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
