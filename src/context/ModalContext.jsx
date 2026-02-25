import React, { createContext, useState, useCallback } from 'react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiHelpCircle } from 'react-icons/fi';

export const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
    const [modalConfig, setModalConfig] = useState(null);

    const closeGuard = useCallback(() => {
        if (modalConfig?.loading) return;
        setModalConfig(null);
    }, [modalConfig]);

    const showAlert = useCallback(({ title, message, type = 'info', icon, onConfirm, confirmText = 'OK', avatarName }) => {
        const Icon = icon || {
            info: FiInfo,
            success: FiCheckCircle,
            warning: FiAlertCircle,
            danger: FiAlertCircle,
        }[type] || FiInfo;

        setModalConfig({
            isOpen: true,
            title,
            type,
            onClose: () => setModalConfig(null),
            content: (
                <div className="text-center py-4">
                    {avatarName ? (
                        <Avatar name={avatarName} size="xl" className="mx-auto mb-4" />
                    ) : (
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${type === 'danger' ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]' :
                            type === 'success' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
                                'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                            }`}>
                            <Icon size={32} />
                        </div>
                    )}
                    <p className="text-[var(--color-text-secondary)]">{message}</p>
                </div>
            ),
            footer: (
                <Button
                    text={confirmText}
                    variant={type === 'danger' ? 'danger' : 'primary'}
                    className="w-full"
                    onClick={() => {
                        setModalConfig(null);
                        if (onConfirm) onConfirm();
                    }}
                />
            )
        });
    }, []);

    const showConfirm = useCallback(({
        title,
        message,
        type = 'warning',
        icon,
        onConfirm,
        onCancel,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        avatarName,
        isDestructive = true
    }) => {
        const Icon = icon || FiHelpCircle;

        const handleConfirm = async () => {
            if (onConfirm) {
                // Optimistic Close: Close the modal immediately for better offline responsiveness
                setModalConfig(null);
                try {
                    await onConfirm();
                } catch (error) {
                    console.error("Confirm action failed:", error);
                    // Error is logged, but modal stays closed to keep UI responsive
                }
            } else {
                setModalConfig(null);
            }
        };


        setModalConfig({
            isOpen: true,
            title,
            type,
            onClose: () => setModalConfig(null),
            loading: false,
            content: (
                <div className="text-center py-4">
                    {avatarName ? (
                        <Avatar name={avatarName} size="xl" className="mx-auto mb-4" />
                    ) : (
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${type === 'danger' ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]' :
                            'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                            }`}>
                            <Icon size={32} />
                        </div>
                    )}
                    <p className="text-[var(--color-text-secondary)]">{message}</p>
                </div>
            ),
            footer: (
                <div className="flex gap-3">
                    <Button
                        text={cancelText}
                        variant="secondary"
                        className="flex-1"
                        onClick={() => {
                            setModalConfig(null);
                            if (onCancel) onCancel();
                        }}
                    />
                    <Button
                        text={confirmText}
                        variant={isDestructive ? 'danger' : 'primary'}
                        className="flex-1"
                        onClick={handleConfirm}
                    />
                </div>
            )
        });
    }, []);

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {modalConfig && (
                <Modal
                    isOpen={modalConfig.isOpen}
                    onClose={closeGuard}
                    title={modalConfig.title}
                    footer={modalConfig.footer}
                >
                    {modalConfig.content}
                </Modal>
            )}
        </ModalContext.Provider>
    );
};
