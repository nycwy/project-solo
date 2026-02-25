import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    Timestamp,
} from 'firebase/firestore';
import {
    FiFileText,
    FiDownload,
    FiCalendar,
    FiCheckCircle,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import PageHeader from '../../components/PageHeader';
import useAlert from '../../hooks/useAlert';
import useNetwork from '../../hooks/useNetwork';

const Statement = () => {
    const { user } = useContext(AuthContext);
    const { showAlert } = useAlert();
    const isOffline = useNetwork();
    const [activeTab, setActiveTab] = useState('journal');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [friendsMap, setFriendsMap] = useState({});

    useEffect(() => {
        const fetchFriends = async () => {
            if (user?.uid) {
                const docSnap = await getDoc(doc(db, 'users', user.uid));
                if (docSnap.exists()) {
                    const list = docSnap.data().friendsList || [];
                    const map = {};
                    list.forEach((f) => (map[f.uid] = f.username));
                    setFriendsMap(map);
                }
            }
        };
        fetchFriends();
    }, [user]);

    const getName = (uid) => {
        if (uid === user.uid) return 'You';
        if (uid === 'SELF') return 'Self';
        return friendsMap[uid] || 'Unknown User';
    };

    const generateJournalPDF = async () => {
        if (!startDate || !endDate) return showAlert({ title: "Dates Required", message: "Please select both start and end dates.", type: "warning" });
        setLoading(true);

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59);

            const q = query(
                collection(db, 'journal'),
                where('uid', '==', user.uid),
                where('date', '>=', Timestamp.fromDate(start)),
                where('date', '<=', Timestamp.fromDate(end))
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((doc) => doc.data());
            data.sort((a, b) => a.date.seconds - b.date.seconds);

            if (data.length === 0) {
                setLoading(false);
                return showAlert({ title: "No Entries", message: "No journal entries found for the selected period.", type: "info" });
            }

            let totalIncome = 0;
            let totalExpense = 0;

            const rows = data.map((item) => {
                const amountVal = Number(item.amount) || 0;
                if (item.type === 'income') totalIncome += amountVal;
                else totalExpense += amountVal;

                return [
                    new Date(item.date.seconds * 1000).toLocaleDateString('en-GB'),
                    item.description || '-',
                    item.category || item.type.toUpperCase(),
                    item.type === 'income' ? `+ ${amountVal.toFixed(2)}` : `- ${amountVal.toFixed(2)}`
                ];
            });

            const pdfDoc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // --- Styling Constants ---
            const primaryColor = '#1A1A1A';
            const secondaryColor = '#6B7280';
            const lineGray = 220;
            const greenColor = '#22C55E';
            const redColor = '#EF4444';

            // --- HEADER ---
            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setFontSize(24);
            pdfDoc.setTextColor(primaryColor);
            pdfDoc.text('Account Statement', 15, 30);

            pdfDoc.setFont('helvetica', 'normal');
            pdfDoc.setFontSize(10);
            pdfDoc.setTextColor(secondaryColor);
            const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            pdfDoc.text(`PERIOD: ${startStr} — ${endStr}`, 15, 40);
            pdfDoc.text(`ACCOUNT: ${user.email}`, 15, 46);

            if (isOffline) {
                pdfDoc.setFont('helvetica', 'bold');
                pdfDoc.setTextColor(redColor);
                pdfDoc.setFontSize(9);
                pdfDoc.text('Generated in Offline Mode. Recent transactions may be pending synchronization with the server.', 15, 52);
            }

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setFontSize(14);
            pdfDoc.setTextColor(primaryColor);
            pdfDoc.text('Journal Entries', 15, 57);

            autoTable(pdfDoc, {
                startY: 62,
                margin: { left: 15, right: 15 },
                head: [[
                    { content: 'Date' },
                    { content: 'Description' },
                    { content: 'Account/Ref' },
                    { content: 'Amount', styles: { halign: 'right' } }
                ]],
                body: rows,
                theme: 'plain',
                styles: {
                    font: 'helvetica',
                    fontSize: 9,
                    textColor: primaryColor,
                    cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
                },
                headStyles: {
                    fontStyle: 'bold',
                    textColor: secondaryColor,
                    fillColor: false,
                    lineWidth: { bottom: 0.2 },
                    lineColor: lineGray
                },
                bodyStyles: {
                    lineWidth: { bottom: 0.1 },
                    lineColor: 240
                },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 30 },
                    1: { halign: 'left' },
                    2: { halign: 'left', cellWidth: 40 },
                    3: { halign: 'right', cellWidth: 40 },
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 3) {
                        const val = data.cell.raw;
                        if (val.startsWith('+')) {
                            data.cell.styles.textColor = greenColor;
                        } else if (val.startsWith('-')) {
                            data.cell.styles.textColor = redColor;
                        }
                    }
                }
            });

            const dividerY = pdfDoc.lastAutoTable.finalY + 10;
            pdfDoc.setDrawColor(lineGray);
            pdfDoc.setLineWidth(0.2);
            pdfDoc.line(15, dividerY, 195, dividerY);

            const finalY = dividerY + 10;

            pdfDoc.setFontSize(10);
            pdfDoc.setTextColor(secondaryColor);
            pdfDoc.text('TOTAL INCOME', 45, finalY, { align: 'center' });

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setTextColor(primaryColor);
            pdfDoc.setFontSize(14);
            pdfDoc.text(totalIncome.toFixed(2), 45, finalY + 6, { align: 'center' });

            pdfDoc.setFont('helvetica', 'normal');
            pdfDoc.setTextColor(secondaryColor);
            pdfDoc.setFontSize(10);
            pdfDoc.text('TOTAL EXPENSE', 105, finalY, { align: 'center' });

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setTextColor(primaryColor);
            pdfDoc.setFontSize(14);
            pdfDoc.text(totalExpense.toFixed(2), 105, finalY + 6, { align: 'center' });

            const savings = totalIncome - totalExpense;
            pdfDoc.setFont('helvetica', 'normal');
            pdfDoc.setTextColor(secondaryColor);
            pdfDoc.setFontSize(10);
            pdfDoc.text(`NET CLOSING ${isOffline ? '(Pending Sync)' : ''}`, 165, finalY, { align: 'center' });

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setFontSize(16);
            pdfDoc.setTextColor(savings >= 0 ? greenColor : redColor);
            pdfDoc.text(savings >= 0 ? savings.toFixed(2) : savings.toFixed(2), 165, finalY + 6, { align: 'center' });

            pdfDoc.save(`Journal_Statement_${startStr.split(' ').join('_')}_to_${endStr.split(' ').join('_')}.pdf`);
        } catch (error) {
            console.error('PDF Error:', error);
            alert('Error generating PDF.');
        }
        setLoading(false);
    };

    const generateSplitterPDF = async () => {
        if (!startDate || !endDate) return showAlert({ title: "Dates Required", message: "Please select both start and end dates.", type: "warning" });
        setLoading(true);

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59);

            const q1 = query(
                collection(db, 'transactions'),
                where('payerId', '==', user.uid),
                where('date', '>=', Timestamp.fromDate(start)),
                where('date', '<=', Timestamp.fromDate(end))
            );
            const q2 = query(
                collection(db, 'transactions'),
                where('debtorId', '==', user.uid),
                where('date', '>=', Timestamp.fromDate(start)),
                where('date', '<=', Timestamp.fromDate(end))
            );

            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            const allTxns = [
                ...snap1.docs.map((d) => ({ ...d.data(), role: 'payer' })),
                ...snap2.docs.map((d) => ({ ...d.data(), role: 'debtor' })),
            ];
            allTxns.sort((a, b) => a.date.seconds - b.date.seconds);

            if (allTxns.length === 0) {
                setLoading(false);
                return showAlert({ title: "No Transactions", message: "No transactions found for the selected period.", type: "info" });
            }

            let totalLent = 0;
            let totalBorrowed = 0;
            let pendingLent = 0;
            let pendingBorrowed = 0;

            const rows = allTxns.map((t) => {
                const isPersonal = t.debtorId === 'SELF';
                let partyName = 'Self';
                let type = 'PERSONAL';
                let amountStr = `${t.amount}`;

                let statusText = t.status === 'confirmed' ? 'Settled' : t.status === 'pending' ? 'Pending' : 'Unknown';

                if (!isPersonal) {
                    if (t.role === 'payer') {
                        type = 'YOU PAID';
                        partyName = getName(t.debtorId);
                        amountStr = `+ ${t.amount}`;
                        if (t.status === 'confirmed') totalLent += Number(t.amount);
                        else if (t.status === 'pending') pendingLent += Number(t.amount);
                    } else {
                        type = 'THEY PAID';
                        partyName = getName(t.payerId);
                        amountStr = `- ${t.amount}`;
                        if (t.status === 'confirmed') totalBorrowed += Number(t.amount);
                        else if (t.status === 'pending') pendingBorrowed += Number(t.amount);
                    }
                }

                return [
                    new Date(t.date.seconds * 1000).toLocaleDateString('en-GB'),
                    t.description || '-',
                    partyName,
                    type,
                    statusText,
                    amountStr,
                ];
            });

            const pdfDoc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const primaryColor = '#1A1A1A';
            const secondaryColor = '#6B7280';
            const lineGray = 220;
            const greenColor = '#22C55E';
            const redColor = '#EF4444';

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setFontSize(24);
            pdfDoc.setTextColor(primaryColor);
            pdfDoc.text('Split statement', 15, 30);

            pdfDoc.setFont('helvetica', 'normal');
            pdfDoc.setFontSize(10);
            pdfDoc.setTextColor(secondaryColor);
            const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            pdfDoc.text(`PERIOD: ${startStr} — ${endStr}`, 15, 40);
            pdfDoc.text(`ACCOUNT: ${user.email}`, 15, 46);

            if (isOffline) {
                pdfDoc.setFont('helvetica', 'bold');
                pdfDoc.setTextColor(redColor);
                pdfDoc.setFontSize(9);
                pdfDoc.text('Generated in Offline Mode. Recent transactions may be pending synchronization with the server.', 15, 52);
            }

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setFontSize(14);
            pdfDoc.setTextColor(primaryColor);
            pdfDoc.text('Split Entries', 15, 57);

            autoTable(pdfDoc, {
                startY: 62,
                margin: { left: 15, right: 15 },
                head: [[
                    { content: 'Date' },
                    { content: 'Description' },
                    { content: 'Party' },
                    { content: 'Status' },
                    { content: 'Amount', styles: { halign: 'right' } }
                ]],
                body: rows.map(r => {
                    const isLent = r[3] === 'YOU PAID';
                    const rawAmt = Number(r[5].replace(/[^0-9.]/g, '')).toFixed(2);
                    return [
                        r[0],
                        r[1] || '-',
                        r[2],
                        r[4],
                        isLent ? `+ ${rawAmt}` : `- ${rawAmt}`
                    ];
                }),
                theme: 'plain',
                styles: {
                    font: 'helvetica',
                    fontSize: 9,
                    textColor: primaryColor,
                    cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
                },
                headStyles: {
                    fontStyle: 'bold',
                    textColor: secondaryColor,
                    fillColor: false,
                    lineWidth: { bottom: 0.2 },
                    lineColor: lineGray
                },
                bodyStyles: {
                    lineWidth: { bottom: 0.1 },
                    lineColor: 240
                },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 25 },
                    1: { halign: 'left' },
                    2: { halign: 'left', cellWidth: 35 },
                    3: { halign: 'left', cellWidth: 25 },
                    4: { halign: 'right', cellWidth: 35 },
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 4) {
                        const val = data.cell.raw;
                        if (val.startsWith('+')) {
                            data.cell.styles.textColor = greenColor;
                        } else if (val.startsWith('-')) {
                            data.cell.styles.textColor = redColor;
                        }
                    }
                }
            });

            const FOOTER_LABELS = {
                owedToUser: "TOTAL TO RECEIVE",
                owedByUser: "TOTAL TO PAY",
                netNeutral: "NET BALANCE (SETTLED)",
                netOwe: "NET BALANCE (TO PAY)",
                netReceive: "NET BALANCE (TO RECEIVE)",
                pendingText: (amount) => `(Includes ${amount} Pending Sync)`
            };

            const dividerY = pdfDoc.lastAutoTable.finalY + 10;
            pdfDoc.setDrawColor(lineGray);
            pdfDoc.setLineWidth(0.2);
            pdfDoc.line(15, dividerY, 195, dividerY);

            const finalY = dividerY + 10;

            pdfDoc.setFontSize(10);
            pdfDoc.setTextColor(secondaryColor);
            pdfDoc.text(FOOTER_LABELS.owedToUser, 45, finalY, { align: 'center' });

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setTextColor(primaryColor);
            pdfDoc.setFontSize(14);
            pdfDoc.text(totalLent.toFixed(2), 45, finalY + 6, { align: 'center' });

            if (pendingLent > 0) {
                pdfDoc.setFont('helvetica', 'normal');
                pdfDoc.setTextColor(secondaryColor);
                pdfDoc.setFontSize(9);
                pdfDoc.text(FOOTER_LABELS.pendingText(pendingLent.toFixed(2)), 45, finalY + 11, { align: 'center' });
            }

            pdfDoc.setFontSize(10);
            pdfDoc.setTextColor(secondaryColor);
            pdfDoc.text(FOOTER_LABELS.owedByUser, 105, finalY, { align: 'center' });

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setTextColor(primaryColor);
            pdfDoc.setFontSize(14);
            pdfDoc.text(totalBorrowed.toFixed(2), 105, finalY + 6, { align: 'center' });

            if (pendingBorrowed > 0) {
                pdfDoc.setFont('helvetica', 'normal');
                pdfDoc.setTextColor(secondaryColor);
                pdfDoc.setFontSize(9);
                pdfDoc.text(FOOTER_LABELS.pendingText(pendingBorrowed.toFixed(2)), 105, finalY + 11, { align: 'center' });
            }

            const netBalance = totalLent - totalBorrowed;
            const netLabel = netBalance > 0 ? FOOTER_LABELS.netReceive : netBalance < 0 ? FOOTER_LABELS.netOwe : FOOTER_LABELS.netNeutral;

            pdfDoc.setFont('helvetica', 'normal');
            pdfDoc.setTextColor(secondaryColor);
            pdfDoc.setFontSize(10);
            pdfDoc.text(`${netLabel} ${isOffline ? '(Pending Sync)' : ''}`, 165, finalY, { align: 'center' });

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setFontSize(16);
            pdfDoc.setTextColor(netBalance >= 0 ? greenColor : redColor);
            pdfDoc.text(Math.abs(netBalance).toFixed(2), 165, finalY + 6, { align: 'center' });

            pdfDoc.save(`Split_Statement_${startStr.split(' ').join('_')}_to_${endStr.split(' ').join('_')}.pdf`);
        } catch (error) {
            console.error('PDF Error:', error);
            alert('Error generating PDF.');
        }
        setLoading(false);
    };

    const handleDownload = () => {
        if (activeTab === 'journal') generateJournalPDF();
        else generateSplitterPDF();
    };

    return (
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
            <PageHeader
                title="Statements"
                subtitle="Download authentic reports"
                icon={FiFileText}
                iconClassName="bg-[var(--color-primary-light)] text-[var(--color-primary)]"
            />

            <Card padding="lg" className="max-w-2xl mx-auto">
                <div className="flex p-1 bg-[var(--color-surface-alt)] rounded-xl mb-6">
                    <button
                        onClick={() => setActiveTab('journal')}
                        className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all duration-300 ${activeTab === 'journal'
                            ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                            }`}
                    >
                        Journal Report
                    </button>
                    <button
                        onClick={() => setActiveTab('splitter')}
                        className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all duration-300 ${activeTab === 'splitter'
                            ? 'bg-[var(--color-surface)] text-[var(--color-warning)] shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                            }`}
                    >
                        Splitter Report
                    </button>
                </div>

                <div className="space-y-5 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="From Date"
                            type="date"
                            value={startDate}
                            setValue={setStartDate}
                            icon={FiCalendar}
                        />
                        <Input
                            label="To Date"
                            type="date"
                            value={endDate}
                            setValue={setEndDate}
                            icon={FiCalendar}
                        />
                    </div>

                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${activeTab === 'journal'
                        ? 'bg-[var(--color-primary-light)] border-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                        : 'bg-[var(--color-warning-light)] border-[var(--color-warning)]/20 text-[var(--color-warning)]'
                        }`}>
                        <FiCheckCircle className="mt-0.5 shrink-0" size={18} />
                        <div>
                            <h3 className="font-bold text-sm mb-1">
                                {activeTab === 'journal' ? 'Personal Journal Statement' : 'Splitter Transaction Statement'}
                            </h3>
                            <p className="text-xs opacity-80 leading-relaxed">
                                {activeTab === 'journal'
                                    ? 'Generates a PDF of your personal income and expense records, including totals and net savings calculations.'
                                    : 'Generates a detailed history of money paid by you and for you, including friend names, status (Settled/Pending), and amounts.'}
                            </p>
                        </div>
                    </div>

                    <Button
                        text={loading ? 'Generating...' : 'Download Statement'}
                        onClick={handleDownload}
                        loading={loading}
                        icon={FiDownload}
                        fullWidth
                        size="lg"
                        variant={activeTab === 'splitter' ? 'warning' : 'primary'}
                        className={activeTab === 'splitter' ? 'shadow-lg shadow-amber-500/25' : ''}
                    />
                </div>
            </Card>
        </div>
    );
};

export default Statement;
