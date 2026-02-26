import React, { useState, useContext } from "react";
import { db } from "../../services/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    limit,
} from "firebase/firestore";
import { AuthContext } from "../../context/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Card from "../../components/Card";
import PageHeader from "../../components/PageHeader";
import { useNavigate } from "react-router-dom";
import { FiUserPlus, FiMail, FiSend } from "react-icons/fi";
import useAlert from "../../hooks/useAlert";

const AddFriend = () => {
    const { user } = useContext(AuthContext);
    const { showAlert } = useAlert();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleAddFriend = async () => {
        setLoading(true);

        try {
            const targetEmail = email.trim().toLowerCase();

            if (!targetEmail) {
                setLoading(false);
                return showAlert({
                    title: "Email Required",
                    message: "Please enter an email address.",
                    type: "warning"
                });
            }

            // Robust Email Regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(targetEmail)) {
                setLoading(false);
                return showAlert({
                    title: "Invalid Email",
                    message: "Please enter a valid email address.",
                    type: "warning"
                });
            }

            if (user && targetEmail === (user.email || "").toLowerCase()) {
                setLoading(false);
                return showAlert({
                    title: "Invalid Action",
                    message: "You cannot add yourself as a friend.",
                    type: "warning"
                });
            }

            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", targetEmail), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setLoading(false);
                return showAlert({
                    title: "User Not Found",
                    message: "No user found with this email. Ask them to register first!",
                    type: "info"
                });
            }

            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();

            // Duplicate check
            const reqQuery = query(
                collection(db, 'friend_requests'),
                where('fromId', '==', user.uid),
                where('toId', '==', friendDoc.id),
                where('status', '==', 'pending')
            );
            const reqSnap = await getDocs(reqQuery);
            if (!reqSnap.empty) {
                setLoading(false);
                return showAlert({ title: "Request Pending", message: "A friend request is already pending for this user.", type: "info" });
            }

            await addDoc(collection(db, "friend_requests"), {
                fromId: user.uid,
                fromEmail: (user.email || "").toLowerCase(),
                fromName: user.username || user.displayName || "A Friend",
                toId: friendDoc.id,
                status: "pending",
                timestamp: serverTimestamp(),
            });

            showAlert({
                title: "Request Sent",
                message: `Friend request sent to ${friendData.username || targetEmail}!`,
                type: "success"
            });

            setEmail("");
            navigate("/friends");
        } catch (err) {
            console.error("Add Friend Error:", err);
            showAlert({
                title: "Error",
                message: "Failed to send friend request. Please try again later.",
                type: "danger"
            });
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
