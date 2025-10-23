"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Send, ArrowLeft } from "lucide-react";

interface PrivateChatViewProps {
  currentUser: { id: string };
  recipient: { id: string; name?: string; profile_pic?: string };
  onBack?: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

export default function PrivateChatView({
  currentUser,
  recipient,
  onBack,
}: PrivateChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);

  /** ✅ Fetch premium safely */
  useEffect(() => {
    const fetchPremium = async () => {
      if (!currentUser?.id) return;

      try {
        let { data, error } = await supabase
          .from("public_profiles")
          .select("premium")
          .eq("id", currentUser.id)
          .single();

        if (error || !data) {
          const fallback = await supabase
            .from("users")
            .select("premium")
            .eq("id", currentUser.id)
            .single();
          data = fallback.data;
          error = fallback.error;
        }

        if (error) console.warn("Premium fetch error:", error);
        if (data?.premium === true) setIsPaid(true);
      } catch (err) {
        console.error("Premium fetch failed:", err);
      }
    };
    fetchPremium();
  }, [currentUser]);

  /** ✅ Fetch previous messages */
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentUser?.id || !recipient?.id) return;

      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},recipient_id.eq.${recipient.id}),and(sender_id.eq.${recipient.id},recipient_id.eq.${currentUser.id})`
          )
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Fetch messages error:", error.message || error);
        } else {
          setMessages(data || []);
          scrollToBottom();
        }
      } catch (err) {
        console.error("Unexpected fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [currentUser, recipient]);

  /** ✅ Real-time updates */
  useEffect(() => {
    if (!currentUser?.id || !recipient?.id) return;

    const channelName = `private_chat_${[currentUser.id, recipient.id]
      .sort()
      .join("_")}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === currentUser.id &&
              msg.recipient_id === recipient.id) ||
            (msg.sender_id === recipient.id &&
              msg.recipient_id === currentUser.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentUser, recipient]);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 120);

  /** ✅ Send message (premium gated) */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!isPaid) {
      alert("💎 Upgrade to premium to send messages!");
      return;
    }

    const { error } = await supabase.from("messages").insert([
      {
        sender_id: currentUser.id,
        recipient_id: recipient.id,
        content: newMessage.trim(),
      },
    ]);

    if (error) {
      console.error("Send message error:", error.message || error);
      alert("Message failed. Try again.");
    } else {
      setNewMessage("");
      scrollToBottom();
    }
  };

  /** ✅ UI */
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-300 hover:text-white transition md:hidden"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <img
          src={
            recipient.profile_pic ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              recipient.name || "User"
            )}`
          }
          alt={recipient.name}
          className="w-10 h-10 rounded-full object-cover border border-gray-700"
        />
        <div>
          <h3 className="text-base font-semibold">
            {recipient.name || "Anonymous"}
          </h3>
          <p className="text-xs text-gray-400">
            {isPaid ? "Premium Member 💎" : "Upgrade to message 💬"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-950">
        {loading ? (
          <p className="text-gray-400 text-center mt-10">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            No messages yet. Start chatting ❤️
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender_id === currentUser.id
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-md ${
                  msg.sender_id === currentUser.id
                    ? "bg-gradient-to-r from-pink-600 to-red-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <p>{msg.content}</p>
                <span className="block text-[10px] mt-1 text-gray-400 text-right">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 p-3 bg-gray-900 border-t border-gray-800 sticky bottom-0"
      >
        <input
          type="text"
          placeholder={
            isPaid ? "Type a message..." : "Upgrade to send messages"
          }
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!isPaid}
          className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-600 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!isPaid}
          className="p-2 bg-pink-600 hover:bg-pink-700 rounded-full transition disabled:opacity-60"
        >
          <Send size={18} className="text-white" />
        </button>
      </form>
    </div>
  );
}
