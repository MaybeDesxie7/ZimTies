"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MessageInputProps {
  currentUserId: string;
  recipientId: string;
  groupId?: string;
  isPremium?: boolean;
}

export default function MessageInput({
  currentUserId,
  recipientId,
  groupId,
  isPremium,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);

    try {
      const { error } = await supabase.from("messages").insert([
        {
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: message.trim(),
          group_id: groupId || null,
        },
      ]);

      if (error) throw error;
      setMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 text-center border-t border-white/10">
        <p className="text-gray-300 text-sm">
          💎 Upgrade to <span className="font-semibold text-pink-400">Glimo Premium</span> to chat with more users.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSend}
      className="flex items-center gap-2 p-3 border-t border-white/10 bg-black/40 backdrop-blur-md"
    >
      <input
        type="text"
        placeholder="Type your message..."
        className="flex-1 bg-white/10 text-white placeholder-gray-400 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-pink-500"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={sending}
      />
      <button
        type="submit"
        disabled={sending}
        className="p-2 bg-pink-600 hover:bg-pink-700 rounded-full transition disabled:opacity-50"
      >
        <Send className="w-5 h-5 text-white" />
      </button>
    </form>
  );
}
