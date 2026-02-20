import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import AuthProvider from "./context/AuthProvider";
import ThemeProvider from "./context/ThemeContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import Logout from "./features/auth/Logout";
import Dashboard from "./features/dashboard/Dashboard";
import AddExpense from "./transactions/AddExpense";
import AddFriend from "./features/friends/AddFriend";
import Profile from "./components/Profile";
import FriendDetails from "./features/friends/FriendDetails";
import Friends from "./features/friends/Friends";
import Journal from "./features/journal/Journal";
import Statement from "./features/statement/Statement";
import Remember from "./features/journal/Remember";

const router = createBrowserRouter([
    {
        path: "/register",
        element: (
            <PublicRoute>
                <Register />
            </PublicRoute>
        ),
    },
    {
        path: "/login",
        element: (
            <PublicRoute>
                <Login />
            </PublicRoute>
        ),
    },

    {
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        children: [
            {
                path: "/",
                element: <Navigate to="/journal" replace />,
            },
            {
                path: "/split",
                element: <Dashboard />,
            },
            {
                path: "/profile",
                element: <Profile />,
            },
            {
                path: "/friends",
                element: <Friends />,
            },
            {
                path: "/journal",
                element: <Journal />,
            },
            {
                path: "/purchase-list",
                element: <Remember />,
            },
            {
                path: "/add-expense",
                element: <AddExpense />,
            },
            {
                path: "/add-expense/:id",
                element: <AddExpense />,
            },
            {
                path: "/add-friend",
                element: <AddFriend />,
            },
            {
                path: "/friend/:id",
                element: <FriendDetails key={window.location.pathname} />,
            },
            {
                path: "/edit-expense/:id",
                element: <AddExpense />,
            },
            {
                path: "/statement",
                element: <Statement />,
            },
            {
                path: "/logout",
                element: <Logout />,
            },
        ],
    },
]);

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ThemeProvider>
    </StrictMode>,
);
