import React, { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/logout');
    }

    return (
        <div>
            <h2>Welcome {user?.username}</h2>
            <Button text='Logout' onClick={handleLogout} className='w-20 bg-red-600 hover:bg-red-700 py-1' />
        </div>
    )
}

export default Dashboard