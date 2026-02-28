/**
 * Shared date/timestamp utilities for Firestore Timestamp objects.
 * Eliminates the repeated ternary pattern across the codebase.
 */

/**
 * Converts a Firestore Timestamp (or similar object) to milliseconds.
 * Handles: Timestamp with toMillis(), plain {seconds} objects, and null/undefined.
 * @param {object|null} ts - Firestore Timestamp or similar
 * @returns {number} Milliseconds since epoch
 */
export const toMillis = (ts) =>
    ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : Date.now());

/**
 * Formats a Firestore Timestamp as a short date string (e.g. "Feb 28").
 * @param {object|null} ts - Firestore Timestamp
 * @returns {string}
 */
export const formatShortDate = (ts) =>
    new Date(toMillis(ts)).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

/**
 * Formats a Firestore Timestamp as a full date string (e.g. "Feb 28, 2026").
 * @param {object|null} ts - Firestore Timestamp
 * @returns {string}
 */
export const formatFullDate = (ts) =>
    new Date(toMillis(ts)).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

/**
 * Sort comparator: latest first (descending by date).
 * Uses createdAt as tiebreaker for same-date entries.
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
export const sortByDateDesc = (a, b) => {
    const timeA = toMillis(a.date);
    const timeB = toMillis(b.date);
    if (timeB !== timeA) return timeB - timeA;
    return toMillis(b.createdAt) - toMillis(a.createdAt);
};

/**
 * Sort comparator: oldest first (ascending by date).
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
export const sortByDateAsc = (a, b) => {
    const timeA = toMillis(a.date);
    const timeB = toMillis(b.date);
    return timeA - timeB;
};
