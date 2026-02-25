import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { AuthContext } from "./AuthContext";

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                const userRef = doc(db, "users", currentUser.uid);

                unsubscribeSnapshot = onSnapshot(
                    userRef,
                    async (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();

                            if (data.email && currentUser.email && data.email !== currentUser.email.toLowerCase()) {
                                try {
                                    await updateDoc(userRef, { email: currentUser.email.toLowerCase() });
                                    data.email = currentUser.email.toLowerCase();
                                } catch (err) {
                                    console.error("Failed to normalize email case:", err);
                                }
                            }

                            setUser({
                                uid: currentUser.uid,
                                email: currentUser.email?.toLowerCase(),
                                displayName: currentUser.displayName,
                                photoURL: currentUser.photoURL,
                                ...data,
                            });
                        } else {
                            setUser({ ...currentUser, email: currentUser.email?.toLowerCase() });
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

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
                <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-[var(--color-primary)] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
    );
};

export default AuthProvider;
