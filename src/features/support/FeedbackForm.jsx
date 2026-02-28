import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
    FiMessageSquare,
    FiUser,
    FiMail,
    FiChevronDown,
    FiSend,
    FiAlertCircle,
    FiStar,
    FiMessageCircle,
} from 'react-icons/fi';
import { LuBug } from 'react-icons/lu';

import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Button from '../../components/Button';
import useAlert from '../../hooks/useAlert';

const feedbackTypes = [
    { value: 'Bug', label: 'Bug Report', icon: LuBug, color: 'text-rose-500' },
    { value: 'Feature', label: 'Feature Request', icon: FiStar, color: 'text-amber-500' },
    { value: 'General', label: 'General Feedback', icon: FiMessageCircle, color: 'text-sky-500' },
];

const FeedbackForm = ({ inModal = false, onClose }) => {
    const { user } = useContext(AuthContext);
    const { showAlert } = useAlert();

    const [feedbackType, setFeedbackType] = useState('General');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const displayName = user?.displayName || 'User';
    const email = user?.email || '';

    const handleSubmit = async () => {
        if (!message.trim()) {
            return showAlert({
                title: 'Empty Message',
                message: 'Please write your feedback before submitting.',
                type: 'warning',
            });
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'feedback'), {
                userId: user.uid,
                email: email,
                feedbackType: feedbackType,
                message: message.trim(),
                createdAt: serverTimestamp(),
            });

            showAlert({
                title: 'Thank You!',
                message: 'Your feedback has been submitted successfully.',
                type: 'success',
            });

            setMessage('');
            setFeedbackType('General');
            if (inModal && onClose) onClose();
        } catch (error) {
            console.error('Feedback submit error:', error);
            showAlert({
                title: 'Oops!',
                message: 'Could not submit feedback. Please try again.',
                type: 'danger',
            });
        }
        setSubmitting(false);
    };

    const selectedType = feedbackTypes.find((t) => t.value === feedbackType);

    const formFields = (
        <div className="space-y-5">

            {/* Name & Email Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full">
                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 ml-1">
                        Name
                    </label>
                    <div className="relative">
                        <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={14} />
                        <input
                            type="text"
                            value={displayName}
                            readOnly
                            className="w-full pl-10 pr-3.5 py-3 bg-[var(--color-surface-alt)] ring-1 ring-inset ring-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-text-muted)] cursor-not-allowed opacity-70"
                        />
                    </div>
                </div>

                <div className="w-full">
                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 ml-1">
                        Email
                    </label>
                    <div className="relative">
                        <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={14} />
                        <input
                            type="email"
                            value={email}
                            readOnly
                            className="w-full pl-10 pr-3.5 py-3 bg-[var(--color-surface-alt)] ring-1 ring-inset ring-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-text-muted)] cursor-not-allowed opacity-70"
                        />
                    </div>
                </div>
            </div>

            {/* Feedback Type */}
            <div className="w-full">
                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 ml-1">
                    Feedback Type
                </label>
                <div className="relative">
                    {selectedType && (
                        <selectedType.icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${selectedType.color}`} size={14} />
                    )}
                    <select
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-text)] outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] transition-all duration-200 appearance-none cursor-pointer"
                    >
                        {feedbackTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                    <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" size={16} />
                </div>
            </div>

            {/* Message */}
            <div className="w-full">
                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 ml-1">
                    Message
                </label>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    rows={inModal ? 4 : 6}
                    placeholder="Describe your feedback, suggestion, or issue in detail..."
                    className="w-full px-3.5 py-3 bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-text)] outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] transition-all duration-200 placeholder:text-[var(--color-text-muted)] resize-none"
                />
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 ml-1">
                    {message.length}/500 characters
                </p>
            </div>

            {/* Submit */}
            <Button
                text="Submit Feedback"
                icon={FiSend}
                variant="primary"
                size="lg"
                fullWidth
                loading={submitting}
                onClick={handleSubmit}
            />
        </div>
    );

    if (inModal) return formFields;

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
            <PageHeader
                title="Feedback"
                subtitle="Help us improve your experience"
                icon={FiMessageSquare}
            />

            {/* Info Banner */}
            <div className="mb-5 flex items-start gap-3 p-3 rounded-xl bg-[var(--color-primary-light)]/50 border border-[var(--color-primary)]/10">
                <FiAlertCircle size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Your feedback is anonymous to other users. Only the admin team can view submissions.
                </p>
            </div>

            {/* Form Card */}
            <Card padding="lg">
                {formFields}
            </Card>
        </div>
    );
};

export default FeedbackForm;
