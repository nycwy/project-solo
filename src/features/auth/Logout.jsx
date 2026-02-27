import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";

const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            try {
                await signOut(auth);

                navigate("/login");
            } catch (error) {
                console.error("Logout failed: ", error);
            }
        };

        performLogout();
    }, [navigate]);

    return (
        <div className="flex justify-center items-center h-screen">
            <p>Logging out...</p>
        </div>
    );
};

export default Logout;
