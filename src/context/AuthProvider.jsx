import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { AuthContext } from "./AuthContext";

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            try {
                if (currentUser) {
                    const userRef = doc(db, "users", currentUser.uid);
                    const fetchedUser = await getDoc(userRef);

                    if (fetchedUser.exists()) {
                        setUser({ ...fetchedUser.data(), uid: currentUser.uid });
                    } else {
                        setUser(currentUser);
                    }
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        });
        return unsubscribe;
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
    );
};

export default AuthProvider;
