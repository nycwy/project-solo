import { useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

const SwipeableCard = ({ children, onEdit, canEdit = true, onDelete, canDelete = true, className }) => {
    const [swiping, setSwiping] = useState(false);
    const [swipedOpen, setSwipedOpen] = useState(false); // false, 'edit', or 'delete'
    const [offset, setOffset] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const instanceId = useRef(Math.random().toString(36).slice(2));

    // Store starting coordinates
    const startX = useRef(null);
    const startY = useRef(null);
    const isHorizontalSwipe = useRef(null); // to track if user is scrolling vertically vs swiping

    const containerRef = useRef(null);
    const cardRef = useRef(null);
    const maxSwipe = useRef(0);

    // Update max swipe limit based on card width (20%)
    useEffect(() => {
        const updateMaxSwipe = () => {
            if (cardRef.current) {
                maxSwipe.current = cardRef.current.offsetWidth * 0.2;
            }
        };
        updateMaxSwipe();
        window.addEventListener('resize', updateMaxSwipe);
        return () => window.removeEventListener('resize', updateMaxSwipe);
    }, []);

    const handleStart = (clientX, clientY) => {
        if (!canEdit && (!canDelete || !onDelete)) return;
        startX.current = clientX;
        startY.current = clientY;
        isHorizontalSwipe.current = null;
        setSwiping(true);
    };

    const handleMove = (clientX, clientY) => {
        if ((!canEdit && (!canDelete || !onDelete)) || startX.current === null) return;

        const diffX = clientX - startX.current;
        const diffY = clientY - startY.current;

        // Determine if it's a prominent horizontal swipe or just vertical scrolling (so we don't trap scroll)
        if (isHorizontalSwipe.current === null) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                isHorizontalSwipe.current = true;
            } else {
                isHorizontalSwipe.current = false;
            }
        }

        // If user is just scrolling down the list, don't swipe the card
        if (!isHorizontalSwipe.current) return;

        // Hide hint once actual swiping starts
        if (showHint) setShowHint(false);

        // Calculate offset
        const baseOffset = swipedOpen === 'edit' ? maxSwipe.current : (swipedOpen === 'delete' ? -maxSwipe.current : 0);
        let newOffset = baseOffset + diffX;

        // Restrict drag based on allowed actions
        if (!canEdit && newOffset > 0) newOffset = 0;
        if ((!canDelete || !onDelete) && newOffset < 0) newOffset = 0;

        // Add elastic friction when pulled past the max width limits
        if (newOffset > maxSwipe.current) {
            newOffset = maxSwipe.current + (newOffset - maxSwipe.current) * 0.15;
        } else if (newOffset < -maxSwipe.current) {
            newOffset = -maxSwipe.current + (newOffset + maxSwipe.current) * 0.15;
        }

        setOffset(newOffset);
    };

    const handleEnd = () => {
        if (!canEdit && (!canDelete || !onDelete)) return;
        setSwiping(false);
        startX.current = null;
        startY.current = null;
        isHorizontalSwipe.current = null;

        // Snap logic
        if (offset > maxSwipe.current * 0.5 && canEdit) {
            setOffset(maxSwipe.current);
            setSwipedOpen('edit');
        } else if (offset < -maxSwipe.current * 0.5 && canDelete && onDelete) {
            setOffset(-maxSwipe.current);
            setSwipedOpen('delete');
        } else {
            setOffset(0);
            setSwipedOpen(false);
        }
    };

    // Close on external click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (swipedOpen && containerRef.current && !containerRef.current.contains(e.target)) {
                setOffset(0);
                setSwipedOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
        };
    }, [swipedOpen]);

    // Close this card's hint when another card opens its hint
    useEffect(() => {
        const handleOtherHint = (e) => {
            if (e.detail !== instanceId.current) {
                setShowHint(false);
            }
        };
        document.addEventListener('swipeable-hint-open', handleOtherHint);
        return () => document.removeEventListener('swipeable-hint-open', handleOtherHint);
    }, []);

    return (
        <div ref={containerRef} className={twMerge("relative w-full rounded-2xl group", className)}>
            {/* Background Edit Button Reveal (Left Side) */}
            {canEdit && (
                <div
                    className="absolute inset-y-0 left-0 w-1/2 bg-[var(--color-primary)] rounded-l-2xl flex items-center justify-start px-5"
                    style={{ opacity: offset > 0 ? 1 : 0, transition: swiping ? 'none' : 'opacity 0.3s ease' }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // prevent triggering card/document clicks
                            setOffset(0);
                            setSwipedOpen(false);
                            if (onEdit) onEdit();
                        }}
                        className="text-white hover:opacity-80 transition-opacity py-2 flex items-center font-bold focus:outline-none h-full outline-none select-none"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <span className="text-sm font-semibold tracking-wide">Edit</span>
                    </button>
                </div>
            )}

            {/* Background Delete Button Reveal (Right Side) */}
            {canDelete && onDelete && (
                <div
                    className="absolute inset-y-0 right-0 w-1/2 bg-[var(--color-danger)] rounded-r-2xl flex items-center justify-end px-5"
                    style={{ opacity: offset < 0 ? 1 : 0, transition: swiping ? 'none' : 'opacity 0.3s ease' }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // prevent triggering card clicks
                            setOffset(0);
                            setSwipedOpen(false);
                            if (onDelete) onDelete();
                        }}
                        className="text-white hover:opacity-80 transition-opacity py-2 flex items-center font-bold focus:outline-none h-full outline-none select-none"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <span className="text-sm font-semibold tracking-wide">Delete</span>
                    </button>
                </div>
            )}

            {/* Foreground Card */}
            <div
                ref={cardRef}
                className={twMerge(
                    "relative w-full touch-pan-y z-10 transition-transform rounded-2xl overflow-hidden bg-[var(--color-surface)]",
                    !swiping && "duration-300"
                )}
                style={{
                    transform: `translate3d(${offset}px, 0, 0)`,
                    transitionTimingFunction: swiping ? 'none' : 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}

                // Touch Events
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handleEnd}

                // Mouse Events (for testing on Desktop)
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onMouseMove={(e) => swiping && handleMove(e.clientX, e.clientY)}
                onMouseUp={handleEnd}
                onMouseLeave={(e) => {
                    if (swiping) handleEnd();
                }}
                onClick={(e) => {
                    if (swipedOpen) {
                        e.stopPropagation();
                        e.preventDefault();
                        setOffset(0);
                        setSwipedOpen(false);
                    } else if (offset === 0 && !swiping) {
                        // Simple toggle
                        const next = !showHint;
                        setShowHint(next);
                        if (next) {
                            document.dispatchEvent(new CustomEvent('swipeable-hint-open', { detail: instanceId.current }));
                        }
                    }
                }}
            >
                {/* Prevent child clicks if swiped open */}
                <div className={twMerge("pb-4 [&>*]:border-0 [&>*]:shadow-none [&>*]:rounded-none", swipedOpen ? "pointer-events-none" : "")}>
                    {children}
                </div>

                {/* Swipe hint overlay — toggle on tap */}
                {showHint && offset === 0 && !swiping && (canEdit || (canDelete && onDelete)) && (
                    <div
                        className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none select-none animate-fade-in z-20"
                    >
                        {canEdit ? (
                            <span className="text-[10px] text-[var(--color-primary)] opacity-80 tracking-wide font-medium">
                                Swipe right to edit →
                            </span>
                        ) : <span />}
                        {canDelete && onDelete ? (
                            <span className="text-[10px] text-[var(--color-danger)] opacity-80 tracking-wide font-medium">
                                ← Swipe left to delete
                            </span>
                        ) : <span />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SwipeableCard;
