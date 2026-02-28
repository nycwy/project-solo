import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Custom hook to fetch and manage the current user's friends map.
 * Returns { friendsMap, getName } where friendsMap is { [uid]: username }
 * and getName(uid) returns a display name.
 */
export default function useFriendsMap() {
    const { user } = useContext(AuthContext);
    const [friendsMap, setFriendsMap] = useState({});

    useEffect(() => {
        if (!user?.uid) return;
        let isMounted = true;

        const fetchFriends = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'users', user.uid));
                if (isMounted && docSnap.exists()) {
                    const list = docSnap.data().friendsList || [];
                    const map = {};
                    list.forEach((f) => (map[f.uid] = f.username));
                    setFriendsMap(map);
                }
            } catch (err) {
                console.error("Error fetching friends:", err);
            }
        };

        fetchFriends();
        return () => { isMounted = false; };
    }, [user]);

    const getName = useCallback((uid) => {
        if (uid === user?.uid) return 'You';
        if (uid === 'SELF') return 'Self';
        return friendsMap[uid] || 'Unknown';
    }, [friendsMap, user?.uid]);

    return { friendsMap, getName };
}
