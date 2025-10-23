"use client";

import { useState } from "react";
import { db } from "@/lib/supabase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function CreatePayment() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("pending");

  const handleCreate = async () => {
    try {
      const docRef = await addDoc(collection(db, "payments"), {
        userId,
        amount: Number(amount),
        method,
        status,
        metadata: {},
        createdAt: serverTimestamp(),
      });
      console.log("Payment created with ID:", docRef.id);
      alert("Payment created!");
      setUserId("");
      setAmount("");
      setMethod("");
      setStatus("pending");
    } catch (error) {
      console.error("Error creating payment:", error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Create Payment</h1>
      <input placeholder="User ID" value={userId} onChange={(e)=>setUserId(e.target.value)} />
      <input type="number" placeholder="Amount" value={amount} onChange={(e)=>setAmount(Number(e.target.value))} />
      <input placeholder="Method (paynow/ecocash/card)" value={method} onChange={(e)=>setMethod(e.target.value)} />
      <input placeholder="Status" value={status} onChange={(e)=>setStatus(e.target.value)} />
      <button onClick={handleCreate}>Create Payment</button>
    </div>
  );
}
