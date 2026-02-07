import React, { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const { user } = useContext(AuthContext);

    return (
        <div>{user ? children : <Navigate to='/register' />}</div>
    )
}

export default ProtectedRoute