import React from 'react'

const Heading = ({ headingText, text }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold text-center text-gray-900">{headingText}</h2>
            <p className='mt-2 text-center text-sm text-gray-600'>{text}</p>
        </div>
    )
}

export default Heading