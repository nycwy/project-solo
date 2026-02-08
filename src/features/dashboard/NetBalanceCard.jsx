import React from "react";

const NetBalanceCard = ({ totalOwed, totalDebt }) => {
    // Calculate the "Net Worth"
    const netBalance = totalOwed - totalDebt;
    const isPositive = netBalance >= 0;

    return (
        <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl mb-6">
            <h3 className="text-blue-100 text-sm font-medium uppercase tracking-wider">
                Net Balance
            </h3>

            {/* The Big Number */}
            <div className="text-4xl font-bold my-2">
                {isPositive ? "+" : "-"}${Math.abs(netBalance).toFixed(2)}
            </div>

            {/* The Breakdown */}
            <div className="flex justify-between mt-6 pt-4 border-t border-blue-500/30">
                <div>
                    <p className="text-blue-200 text-xs mb-1">You are owed</p>
                    <p className="text-green-300 font-semibold text-lg">
                        +${totalOwed.toFixed(2)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-blue-200 text-xs mb-1">You owe</p>
                    <p className="text-red-300 font-semibold text-lg">
                        -${totalDebt.toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NetBalanceCard;
