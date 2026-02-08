import React, { useEffect, useState } from "react";
import { db, auth } from "./services/firebase";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth"; // <--- Import this

const DebugTransactions = () => {
  const [allDocs, setAllDocs] = useState([]);
  const [myUid, setMyUid] = useState("Loading...");

  useEffect(() => {
    // 1. FIX: Use the listener instead of direct access
    // This is safe, async, and waits for Firebase to initialize properly.
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
      } else {
        setMyUid("Not Logged In - Check AuthContext");
      }
    });

    // 2. Fetch ALL transactions (No filters!)
    const fetchAll = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        const docs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllDocs(docs);
      } catch (error) {
        console.error("Error fetching:", error);
      }
    };
    fetchAll();

    return () => unsubAuth(); // Cleanup listener
  }, []);

  return (
    <div className="p-10 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">🕵️‍♂️ Database Detective</h1>

      <div className="bg-white p-4 rounded shadow mb-6 border-l-4 border-blue-500">
        <h2 className="font-bold text-gray-500 text-sm">MY CURRENT UID</h2>
        <p className="font-mono text-lg text-blue-600 break-all">{myUid}</p>
      </div>

      <h2 className="font-bold mb-2">
        Raw Database Contents ({allDocs.length} items):
      </h2>
      <div className="space-y-4">
        {allDocs.map((doc) => {
          // Check for mismatch
          const isMatch = doc.payerId === myUid;

          return (
            <div
              key={doc.id}
              className={`p-4 rounded border-2 ${isMatch ? "border-green-500 bg-green-50" : "border-red-300 bg-red-50"}`}
            >
              <p className="font-bold text-gray-700">
                {doc.description} (${doc.amount})
              </p>
              <div className="mt-2 text-xs font-mono">
                <p>
                  Payer ID in DB:{" "}
                  <span
                    className={
                      isMatch
                        ? "text-green-700 font-bold"
                        : "text-red-600 font-bold"
                    }
                  >
                    {doc.payerId}
                  </span>
                </p>
                <p>
                  My Current ID: <span className="text-gray-500">{myUid}</span>
                </p>
                <p className="mt-1 font-bold">
                  {isMatch ? "✅ MATCHES!" : "❌ MISMATCH"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DebugTransactions;
