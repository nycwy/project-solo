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

const router = createBrowserRouter([
    {
        path: '/register',
        element: (
            <PublicRoute>
                <Register />
            </PublicRoute>
        )
    },
    {
        path: '/login',
        element: (
            <PublicRoute>
                <Login />
            </PublicRoute>
        )
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        )
    }
])

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    </StrictMode>,
)
