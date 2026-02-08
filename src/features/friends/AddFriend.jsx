import React, { useState } from "react";
import { db, auth } from "../../services/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    arrayUnion,
} from "firebase/firestore";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { useNavigate } from "react-router-dom";

const AddFriend = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAddFriend = async () => {
        setError("");
        setMessage("");
        setLoading(true);

        try {
            if (!email) throw new Error("Please enter an email address.");
            if (auth.currentUser && email === auth.currentUser.email) {
                throw new Error("You cannot add yourself as a friend.");
            }

            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("User not found. Ask your friend to register first!");
            }

            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();

            console.log("Found Friend Data:", friendData);

            const friendUid = friendData.uid || friendDoc.id;
            const friendEmail = friendData.email || email;
            const friendName =
                friendData.username || friendData.displayName || "Unknown Friend";

            if (!friendUid) {
                throw new Error("This user's data is corrupted (missing UID).");
            }

            const myUserRef = doc(db, "users", auth.currentUser.uid);

            await updateDoc(myUserRef, {
                friendsList: arrayUnion({
                    uid: friendUid,
                    email: friendEmail,
                    username: friendName,
                }),
            });

            setMessage(`Success! Added ${friendName} to your friends.`);
            setEmail("");
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => navigate("/")}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ← Back
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">Add Friend</h2>
                    <div className="w-6"></div>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Enter the email address of the person you want to split bills with.
                    </p>

                    {error && (
                        <div className="p-3 bg-red-100 text-red-700 rounded text-sm border border-red-200">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="p-3 bg-green-100 text-green-700 rounded text-sm border border-green-200">
                            {message}
                        </div>
                    )}

                    <Input
                        type="email"
                        placeholder="friend@example.com"
                        value={email}
                        setValue={setEmail}
                    />

                    <Button
                        text={loading ? "Searching..." : "Add Friend"}
                        onClick={handleAddFriend}
                        disabled={loading}
                    />
                </div>
            </div>
        </div>
    );
};

export default AddFriend;
