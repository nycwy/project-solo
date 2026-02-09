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
import { FiArrowLeft } from "react-icons/fi";

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
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 transition-all hover:shadow-2xl">
                <div className="flex items-center gap-2 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">Add New Friend</h2>
                </div>

                <div className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium text-center">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl text-sm border border-green-100 font-medium text-center">
                            {message}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Friend's Email
                        </label>
                        <Input
                            type="email"
                            placeholder="friend@example.com"
                            value={email}
                            setValue={setEmail}
                            className="bg-gray-50 focus:bg-white"
                        />
                    </div>

                    <Button
                        text={loading ? "Sending Request..." : "Send Request"}
                        onClick={handleAddFriend}
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-200"
                    />
                </div>
            </div>
        </div>
    );
};

export default AddFriend;
