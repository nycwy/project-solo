import React, { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { Navigate } from 'react-router-dom';

const PublicRoute = ({ children }) => {
    const { user } = useContext(AuthContext);

    return (
        <div>
            {user ? <Navigate to='/journal' /> : children}
        </div>
    )
}

export default PublicRoute