import Badge from './Badge';
import { FiCheckCircle, FiClock, FiX } from 'react-icons/fi';

/**
 * Shared StatusBadge component for transaction status display.
 * Used by Dashboard and FriendDetails.
 * @param {object} props
 * @param {object} props.transaction - The transaction object with status/settleStatus/debtorId
 * @param {boolean} [props.showPersonal=false] - Whether to show "Personal" badge for SELF transactions
 */
const StatusBadge = ({ transaction: t, showPersonal = false }) => {
    if (showPersonal && t.debtorId === 'SELF') return <Badge variant="gray">Personal</Badge>;
    if (t.settleStatus === 'settled') return <Badge variant="success" icon={FiCheckCircle}>Settled</Badge>;
    if (t.settleStatus === 'settle_pending') return <Badge variant="purple" icon={FiClock}>Settling</Badge>;
    if (t.status === 'confirmed') return <Badge variant="info" icon={FiCheckCircle}>Accepted</Badge>;
    if (t.status === 'pending') return <Badge variant="pending" icon={FiClock}>Pending</Badge>;
    if (t.status === 'rejected') return <Badge variant="danger" icon={FiX}>Rejected</Badge>;
    return null;
};

export default StatusBadge;
