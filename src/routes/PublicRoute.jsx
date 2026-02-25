import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Spinner from '../components/Spinner';

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
                <Spinner size="lg" />
            </div>
        );
    }

    return user ? <Navigate to="/journal" /> : children;
};

export default PublicRoute;