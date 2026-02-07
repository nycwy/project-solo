import React, { useState } from 'react'
import Input from '../../components/Input'
import Heading from '../../components/Heading';
import Button from '../../components/Button';
import Already from '../../components/Already';

const Register = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = () => {

    }
    return (
        <div className='flex items-center justify-center min-h-screen bg-gray-100'>
            <div className='w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100'>
                <Heading
                    headingText='Create Account'
                    text='The awkward-free way to split bills and manage shared costs.' />
                <Input
                    type='email'
                    value={email}
                    placeholder='Email'
                    setValue={setEmail} />
                <Input
                    type='text'
                    value={username}
                    placeholder='Username'
                    setValue={setUsername} />
                <Input
                    type='password'
                    value={password}
                    placeholder='Password'
                    setValue={setPassword} />
                <Button text="Register" onClick={handleRegister} />
                <Already text='Already have an account?' linkText='Login' link='/login' />
            </div>
        </div>
    )
}

export default Register