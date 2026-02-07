import { twMerge } from 'tailwind-merge'

const Button = ({ text, onClick, className }) => {
    return (
        <div className='text-center'>
            <button className={twMerge('bg-green-600 text-white px-4 py-2 rounded-md w-1/2 shadow-lg font-semibold hover:bg-green-700', className)} onClick={onClick}>{text}</button>
        </div>
    )
}

export default Button