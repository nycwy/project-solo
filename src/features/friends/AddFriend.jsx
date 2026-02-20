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
import Card from "../../components/Card";
import PageHeader from "../../components/PageHeader";
import { useNavigate } from "react-router-dom";
import { FiUserPlus, FiMail, FiSend } from "react-icons/fi";

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

            setTimeout(() => navigate("/friends"), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
            <PageHeader
                title="Add New Friend"
                subtitle="Connect with friends"
                icon={FiUserPlus}
                onBack={true}
            />

            <Card padding="lg" className="max-w-md mx-auto">
                <div className="space-y-6">
                    {error && (
                        <div className="p-3 bg-[var(--color-danger-light)] text-[var(--color-danger)] rounded-xl text-sm border border-[var(--color-border)] font-medium text-center">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="p-3 bg-[var(--color-success-light)] text-[var(--color-success)] rounded-xl text-sm border border-[var(--color-border)] font-medium text-center">
                            {message}
                        </div>
                    )}

                    <Input
                        label="Friend's Email"
                        type="email"
                        placeholder="friend@example.com"
                        value={email}
                        setValue={setEmail}
                        icon={FiMail}
                    />

                    <Button
                        text={loading ? "Sending Request..." : "Send Request"}
                        onClick={handleAddFriend}
                        loading={loading}
                        icon={FiSend}
                        fullWidth
                        size="lg"
                    />
                </div>
            </Card>
        </div>
    );
};

export default AddFriend;
