import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Register from './features/auth/Register'
import Login from './features/auth/Login'
import ProtectedRoute from './routes/ProtectedRoute'
import Dashboard from './features/dashboard/Dashboard'
import PublicRoute from './routes/PublicRoute'
import AuthProvider from './context/AuthProvider'
import Logout from './features/auth/Logout'
import AddExpense from './transactions/AddExpense'
import AddFriend from './features/friends/AddFriend'
import Profile from './components/Profile'
import FriendDetails from './features/friends/FriendDetails'
import Friends from './features/friends/Friends'
import Journal from './features/journal/Journal'

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
        path: "/logout",
        element: (
            <ProtectedRoute>
                <Logout />
            </ProtectedRoute>
        ),
    },
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        ),
    },
    {
        path: "/profile",
        element: (
            <ProtectedRoute>
                <Profile />
            </ProtectedRoute>
        ),
    },
    {
        path: "/add-expense",
        element: (
            <ProtectedRoute>
                <AddExpense />
            </ProtectedRoute>
        ),
    },
    {
        path: "/friends",
        element: (
            <ProtectedRoute>
                <Friends />
            </ProtectedRoute>
        )
    },
    {
        path: "/add-friend",
        element: (
            <ProtectedRoute>
                <AddFriend />
            </ProtectedRoute>
        ),
    },
    {
        path: "/friend/:id",
        element: (
            <ProtectedRoute>
                <FriendDetails />
            </ProtectedRoute>
        ),
    },
    {
        path: "/edit-expense/:id",
        element: (
            <ProtectedRoute>
                <AddExpense />
            </ProtectedRoute>
        ),
    },
    {
        path: "/journal",
        element: (
            <ProtectedRoute>
                <Journal />
            </ProtectedRoute>
        ),
    },
]);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AuthProvider>
                <RouterProvider router={router} />
        </AuthProvider>
    </StrictMode>,
)
