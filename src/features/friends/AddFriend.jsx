import { useState, useContext } from "react";
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
                    title: "Enter an email",
                    message: "Please enter an email address.",
                    type: "warning"
                });
            }

            // Robust Email Regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(targetEmail)) {
                setLoading(false);
                return showAlert({
                    title: "Check your email",
                    message: "That doesn't look like a valid email.",
                    type: "warning"
                });
            }

            if (user && targetEmail === (user.email || "").toLowerCase()) {
                setLoading(false);
                return showAlert({
                    title: "That's you!",
                    message: "Can't add yourself as a friend.",
                    type: "warning"
                });
            }

            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", targetEmail), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setLoading(false);
                return showAlert({
                    title: "No luck",
                    message: "No one with that email. They'll need to sign up first!",
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
                return showAlert({ title: "Already sent", message: "A friend request is already pending for this user.", type: "info" });
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
                title: "Sent!",
                message: `Friend request sent to ${friendData.username || targetEmail}!`,
                type: "success"
            });

            setEmail("");
            navigate("/friends");
        } catch (err) {
            console.error("Add Friend Error:", err);
            showAlert({
                title: "Something went wrong",
                message: "Couldn't send the request. Try again later.",
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
                subtitle="Find people you know"
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
