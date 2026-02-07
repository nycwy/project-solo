import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react'
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AuthContext } from './AuthContext'

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userRef = doc(db, "users", currentUser.uid);
                const fetchedUser = await getDoc(userRef);
                setUser({ ...fetchedUser.data(), id: fetchedUser.id });
            } else {
                setUser(null);
            }
        });
        return unsubscribe;
    }, []);

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider