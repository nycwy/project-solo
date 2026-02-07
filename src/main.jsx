import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Register from './features/auth/Register'
import Login from './features/auth/Login'

const router = createBrowserRouter([
    {
        path: '/register',
        element: <Register />
    },
    {
        path: '/login',
        element: <Login />
    }
])

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
)
