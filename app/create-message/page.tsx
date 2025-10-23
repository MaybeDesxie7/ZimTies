"use client";

import { useState } from "react";
import { db } from "@/lib/supabase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function CreateMessage() {
  const [matchId, setMatchId] = useState("");
  const [senderId, setSenderId] = useState("");
  const [content, setContent] = useState("");

  const handleCreate = async () => {
    try {
      const docRef = await addDoc(collection(db, "messages"), {
        matchId,
        senderId,
        content,
        timestamp: serverTimestamp(),
      });
      console.log("Message created with ID:", docRef.id);
      alert("Message created!");
      setMatchId("");
      setSenderId("");
      setContent("");
    } catch (error) {
      console.error("Error creating message:", error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Create Message</h1>
      <input placeholder="Match ID" value={matchId} onChange={(e)=>setMatchId(e.target.value)} />
      <input placeholder="Sender ID" value={senderId} onChange={(e)=>setSenderId(e.target.value)} />
      <input placeholder="Content" value={content} onChange={(e)=>setContent(e.target.value)} />
      <button onClick={handleCreate}>Create Message</button>
    </div>
  );
}
