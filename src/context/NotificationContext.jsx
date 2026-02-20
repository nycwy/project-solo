import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { db } from "../services/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [friendRequestsCount, setFriendRequestsCount] = useState(0);
    const [splitRequestsCount, setSplitRequestsCount] = useState(0);

    useEffect(() => {
        if (!user?.uid) {
            setFriendRequestsCount(0);
            setSplitRequestsCount(0);
            return;
        }

        // Listen for friend requests
        const friendQ = query(
            collection(db, "friend_requests"),
            where("toId", "==", user.uid),
            where("status", "==", "pending")
        );

        const unsubFriend = onSnapshot(friendQ, (snapshot) => {
            setFriendRequestsCount(snapshot.docs.length);
        });

        // Listen for split requests (pending transactions where user is debtor)
        const splitQ = query(
            collection(db, "transactions"),
            where("debtorId", "==", user.uid),
            where("status", "==", "pending")
        );

        const unsubSplit = onSnapshot(splitQ, (snapshot) => {
            setSplitRequestsCount(snapshot.docs.length);
        });

        return () => {
            unsubFriend();
            unsubSplit();
        };
    }, [user]);

    return (
        <NotificationContext.Provider
            value={{ friendRequestsCount, splitRequestsCount }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
