import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { AuthContext } from "./AuthContext";

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dots, setDots] = useState(".");

    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                const userRef = doc(db, "users", currentUser.uid);

                unsubscribeSnapshot = onSnapshot(
                    userRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            setUser({
                                uid: currentUser.uid,
                                email: currentUser.email,
                                displayName: currentUser.displayName,
                                photoURL: currentUser.photoURL,
                                ...docSnap.data(),
                            });
                        } else {
                            setUser(currentUser);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Error listening to user data:", error);
                        setLoading(false);
                    },
                );
            } else {
                setUser(null);
                setLoading(false);
                if (unsubscribeSnapshot) unsubscribeSnapshot();
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setDots((prev) => (prev.length < 3 ? prev + "." : "."));
            }, 500);
            return () => clearInterval(interval);
        }
    }, [loading]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <p className="text-2xl font-bold text-gray-600 tracking-wide">
                    Loading{dots}
                </p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
    );
};

export default AuthProvider;
