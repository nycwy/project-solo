import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";

const Already = ({ text, link, linkText, className }) => {
    return (
        <div className='flex space-x-1.5'>
            <p>{text}</p>
            <Link className={twMerge('text-blue-800 font-medium hover:underline', className)} to={link}>{linkText}</Link>
        </div>
    )
}

export default Already;