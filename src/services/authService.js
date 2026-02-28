import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser } from "firebase/auth";
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Checks if the current user has any unsettled split transactions.
 * Returns { canDelete: true } if no unsettled transactions exist,
 * or { canDelete: false, count } with the number of unsettled transactions.
 */
export async function checkUnsettledTransactions() {
    const user = auth.currentUser;
    if (!user) return { canDelete: false, count: 0 };

    // Query all transactions where the user is the payer
    const payerQuery = query(
        collection(db, "transactions"),
        where("payerId", "==", user.uid)
    );

    // Query all transactions where the user is the debtor
    const debtorQuery = query(
        collection(db, "transactions"),
        where("debtorId", "==", user.uid)
    );

    const [payerSnap, debtorSnap] = await Promise.all([
        getDocs(payerQuery),
        getDocs(debtorQuery),
    ]);

    const combined = [...payerSnap.docs, ...debtorSnap.docs];
    const uniqueDocs = Array.from(new Map(combined.map(d => [d.id, d])).values());

    const unsettled = uniqueDocs.filter(d => {
        const data = d.data();
        const isPayer = data.payerId === user.uid;

        // If I'm the payer, skip SELF records. If I'm the debtor, it can't be SELF.
        if (isPayer && data.debtorId === "SELF") return false;

        // Count if not rejected and not settled
        return data.status !== "rejected" && data.settleStatus !== "settled";
    });

    return unsettled.length > 0
        ? { canDelete: false, count: unsettled.length }
        : { canDelete: true, count: 0 };
}

/**
 * Cascade-deletes all user data from Firestore collections.
 * Must be called BEFORE deleting the auth account.
 */
async function cascadeDeleteUserData(uid) {
    const batch = writeBatch(db);
    let opCount = 0;

    const collections = [
        { name: 'journal', field: 'uid' },
        { name: 'shopping_list', field: 'uid' },
        { name: 'feedback', field: 'userId' },
    ];

    // Delete owned documents from simple collections
    for (const col of collections) {
        const q = query(collection(db, col.name), where(col.field, '==', uid));
        const snap = await getDocs(q);
        snap.forEach((d) => {
            batch.delete(d.ref);
            opCount++;
        });
    }

    // Delete transactions where user is payer
    const payerQ = query(collection(db, 'transactions'), where('payerId', '==', uid));
    const payerSnap = await getDocs(payerQ);
    payerSnap.forEach((d) => {
        batch.delete(d.ref);
        opCount++;
    });

    // Delete transactions where user is debtor
    const debtorQ = query(collection(db, 'transactions'), where('debtorId', '==', uid));
    const debtorSnap = await getDocs(debtorQ);
    debtorSnap.forEach((d) => {
        batch.delete(d.ref);
        opCount++;
    });

    // Delete friend requests (sent or received)
    const frFrom = query(collection(db, 'friend_requests'), where('fromId', '==', uid));
    const frTo = query(collection(db, 'friend_requests'), where('toId', '==', uid));
    const [frFromSnap, frToSnap] = await Promise.all([getDocs(frFrom), getDocs(frTo)]);
    frFromSnap.forEach((d) => { batch.delete(d.ref); opCount++; });
    frToSnap.forEach((d) => { batch.delete(d.ref); opCount++; });

    // Delete the user document itself
    batch.delete(doc(db, 'users', uid));
    opCount++;

    // Firestore batches have a 500-op limit; this should be well within it for most users
    if (opCount > 0) {
        await batch.commit();
    }
}

/**
 * Deletes the currently logged-in user's account.
 *
 * Flow:
 *  1. Gets the current user from Firebase Auth.
 *  2. Re-authenticates (Email/Password OR Google popup).
 *  3. Cascade-deletes all user data from Firestore.
 *  4. Deletes the Firebase Auth account.
 *
 * @param {string} [password] - Required for Email/Password users. Ignored for Google users.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteAccount(password) {
    try {
        const user = auth.currentUser;

        if (!user) {
            return { success: false, error: "No user is currently signed in." };
        }

        // Determine auth provider
        const providerId = user.providerData?.[0]?.providerId;

        if (providerId === 'google.com') {
            // Re-authenticate with Google popup
            const googleProvider = new GoogleAuthProvider();
            await reauthenticateWithPopup(user, googleProvider);
        } else {
            // Re-authenticate with Email/Password
            if (!user.email) {
                return { success: false, error: "User email is not available. Cannot re-authenticate." };
            }
            if (!password) {
                return { success: false, error: "Password is required for email/password accounts." };
            }
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
        }

        // Cascade-delete all user data from Firestore
        await cascadeDeleteUserData(user.uid);

        // Delete the Firebase Auth account
        await deleteUser(user);

        return { success: true };
    } catch (error) {
        console.error("Delete account failed:", error);

        let message;
        switch (error.code) {
            case "auth/wrong-password":
            case "auth/invalid-credential":
                message = "Incorrect password. Please try again.";
                break;
            case "auth/too-many-requests":
                message = "Too many failed attempts. Please try again later.";
                break;
            case "auth/network-request-failed":
                message = "Network error. Please check your connection and try again.";
                break;
            case "auth/requires-recent-login":
                message = "Session expired. Please log in again and retry.";
                break;
            case "auth/popup-closed-by-user":
                message = "Google sign-in was cancelled. Please try again.";
                break;
            case "auth/popup-blocked":
                message = "Popup was blocked by the browser. Please allow popups and try again.";
                break;
            default:
                message = error.message || "An unexpected error occurred. Please try again.";
        }

        return { success: false, error: message };
    }
}
