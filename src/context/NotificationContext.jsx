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

        // 2. Transactions I need to accept (as debtor)
        const acceptQ = query(
            collection(db, "transactions"),
            where("debtorId", "==", user.uid),
            where("status", "==", "pending")
        );

        // 3. Settlements I need to confirm (as payer)
        const settleQ = query(
            collection(db, "transactions"),
            where("payerId", "==", user.uid),
            where("settleStatus", "==", "settle_pending")
        );

        let acceptCount = 0;
        let settleCount = 0;

        const unsubAccept = onSnapshot(acceptQ, (snap) => {
            acceptCount = snap.docs.length;
            setSplitRequestsCount(acceptCount + settleCount);
        });

        const unsubSettle = onSnapshot(settleQ, (snap) => {
            settleCount = snap.docs.length;
            setSplitRequestsCount(acceptCount + settleCount);
        });

        return () => {
            unsubFriend();
            unsubAccept();
            unsubSettle();
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
