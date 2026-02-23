import { useContext } from 'react';
import { ModalContext } from '../context/ModalContext';

const useAlert = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useAlert must be used within a ModalProvider');
    }
    return context;
};

export default useAlert;
