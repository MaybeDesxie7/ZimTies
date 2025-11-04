"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Send, ArrowLeft } from "lucide-react";

interface PrivateChatViewProps {
  currentUser: { id: string };
  recipient: { id: string; name?: string; profile_pic?: string | null; premium?: boolean | null };
  onBack?: () => void;
  isPaid: boolean;
}

interface Message {
  id?: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

export default function PrivateChatView({
  currentUser,
  recipient,
  onBack,
  isPaid,
}: PrivateChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /** Fetch previous messages between the two users */
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentUser?.id || !recipient?.id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},recipient_id.eq.${recipient.id}),and(sender_id.eq.${recipient.id},recipient_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true });

      if (!error && data) setMessages(data);
      setLoading(false);
      scrollToBottom();
    };
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, recipient]);

  /** Real-time updates for this private conversation */
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
            (msg.sender_id === currentUser.id && msg.recipient_id === recipient.id) ||
            (msg.sender_id === recipient.id && msg.recipient_id === currentUser.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, recipient]);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 120);

  /** Send message instantly */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!isPaid) {
      alert("💎 Upgrade to premium to send messages!");
      return;
    }

    const tempMessage: Message = {
      sender_id: currentUser.id,
      recipient_id: recipient.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    // optimistic update so message appears instantly
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
    scrollToBottom();

    // send to supabase (persist)
    const { error } = await supabase.from("messages").insert([tempMessage]);
    if (error) {
      console.error("Send message error:", error);
      // optional: mark message failed in UI or notify user
    }
  };

  /** UI */
  return (
    <div
      className="flex flex-col h-screen text-white"
      style={{
        // subtle overlay of the Zimbabwean gradient in the chat view
        background: "linear-gradient(180deg, rgba(0,122,61,0.06) 0%, rgba(252,209,22,0.03) 40%, rgba(206,17,38,0.02) 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black/60 border-b border-black/30 sticky top-0 z-10 backdrop-blur-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-300 hover:text-white transition md:hidden"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
        )}

        <img
          src={
            recipient.profile_pic ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(recipient.name || "User")}`
          }
          alt={recipient.name || "User"}
          className="w-10 h-10 rounded-full object-cover border border-black/40"
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate">
            {recipient.name || "Anonymous"}
          </h3>
          <p className="text-xs text-yellow-100/80 truncate">
            {recipient.premium ? "Premium Member 💎" : isPaid ? "You can message" : "Upgrade to message 💬"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-transparent">
        {loading ? (
          <p className="text-gray-300 text-center mt-10">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-300 text-center mt-10">No messages yet. Start chatting ❤️</p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`flex ${msg.sender_id === currentUser.id ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-md break-words ${
                  msg.sender_id === currentUser.id
                    ? "bg-gradient-to-r from-yellow-400 via-red-500 to-black text-white"
                    : "bg-black/70 text-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className="block text-[10px] mt-1 text-gray-300 text-right">
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

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 p-3 bg-black/70 border-t border-black/30 sticky bottom-0"
      >
        <input
          type="text"
          placeholder={isPaid ? "Type a message..." : "Upgrade to send messages"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!isPaid}
          className="flex-1 bg-black/60 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!isPaid}
          className="p-2 bg-yellow-400 hover:bg-yellow-300 rounded-full transition disabled:opacity-60"
          aria-label="Send message"
        >
          <Send size={18} className="text-black" />
        </button>
      </form>
    </div>
  );
}
