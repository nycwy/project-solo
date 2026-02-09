import React, { useState, useContext } from "react";
import { db } from "../../services/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import { AuthContext } from "../../context/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { useNavigate } from "react-router-dom";

const AddFriend = () => {
    const { user } = useContext(AuthContext);
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

            const targetEmail = email.trim().toLowerCase();
            if (user && targetEmail === user.email.toLowerCase()) {
                throw new Error("You cannot add yourself.");
            }

            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", targetEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("User not found. Ask them to register first!");
            }

            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();

            await addDoc(collection(db, "friend_requests"), {
                fromId: user.uid,
                fromEmail: user.email,
                fromName: user.username || "A Friend",
                toId: friendDoc.id,
                status: "pending",
                timestamp: serverTimestamp(),
            });

            setMessage(`Request sent to ${friendData.username || targetEmail}!`);
            setEmail("");

            setTimeout(() => navigate("/"), 2000);
        } catch (err) {
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
                        text={loading ? "Sending..." : "Send Request"}
                        onClick={handleAddFriend}
                        disabled={loading}
                    />
                </div>
            </div>
        </div>
    );
};

export default AddFriend;
