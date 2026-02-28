import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Deletes the currently logged-in user's account.
 *
 * Flow:
 *  1. Gets the current user from Firebase Auth.
 *  2. Re-authenticates using the provided password.
 *  3. Deletes the user's Firestore document from the "users" collection.
 *  4. Deletes the Firebase Auth account.
 *
 * @param {string} password - The user's current password for re-authentication.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteAccount(password) {
    try {
        // 1. Get the currently logged-in user
        const user = auth.currentUser;

        if (!user) {
            return { success: false, error: "No user is currently signed in." };
        }

        if (!user.email) {
            return { success: false, error: "User email is not available. Cannot re-authenticate." };
        }

        // 2. Create credential and re-authenticate
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        // 3. Delete the user's Firestore document first (while still authenticated)
        const userDocRef = doc(db, "users", user.uid);
        await deleteDoc(userDocRef);

        // 4. Delete the Firebase Auth account
        await deleteUser(user);

        return { success: true };
    } catch (error) {
        console.error("Delete account failed:", error);

        // Map common Firebase error codes to user-friendly messages
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
            default:
                message = error.message || "An unexpected error occurred. Please try again.";
        }

        return { success: false, error: message };
    }
}
