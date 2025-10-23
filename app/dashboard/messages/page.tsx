"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PrivateChatView from "./PrivateChatView";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [search, setSearch] = useState("");
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 1. Get authenticated user
  useEffect(() => {
    let mounted = true;
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setAuthUser(null);
        setLoading(false);
        return;
      }
      if (mounted) {
        setAuthUser({ id: data.user.id });
        setLoading(false);
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setAuthUser({ id: session.user.id });
      else setAuthUser(null);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  // ✅ 2. Check payment status
  useEffect(() => {
    if (!authUser?.id) {
      setIsPaid(null);
      return;
    }

    const checkPaid = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("status")
        .eq("user_id", authUser.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setIsPaid(true);
      } else {
        setIsPaid(false);
      }
    };

    checkPaid();
  }, [authUser]);

  // ✅ 3. Fetch messages for the logged-in user
  useEffect(() => {
    if (!authUser?.id) return;
    let isMounted = true;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${authUser.id},recipient_id.eq.${authUser.id}`)
        .order("created_at", { ascending: false });

      if (!error && data && isMounted) setMessages(data);
    };

    fetchMessages();

    // Optional: real-time listener for new messages
    const channel = supabase
      .channel("messages_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (!isMounted) return;
          const newMsg = payload.new as Message;
          if (
            newMsg.sender_id === authUser.id ||
            newMsg.recipient_id === authUser.id
          ) {
            setMessages((prev) => [newMsg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [authUser]);

  // ✅ 4. Derive recent unique chat partners
  const uniqueUsers = Array.from(
    new Map(
      messages.map((msg) => {
        const partnerId =
          msg.sender_id === authUser?.id ? msg.recipient_id : msg.sender_id;
        return [partnerId, msg];
      })
    ).values()
  );

  // ✅ 5. Handle chat selection
  const handleSelect = (partnerId: string) => {
    if (!authUser) return;
    if (isPaid === false) {
      setSelectedUser({ id: partnerId, full_name: `User ${partnerId.slice(0, 4)}` });
      return;
    }

    setSelectedUser({
      id: partnerId,
      full_name: `User ${partnerId.slice(0, 6)}`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p>Loading messages...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p>Please log in to access messages.</p>
      </div>
    );
  }

  // ✅ 6. UI rendering
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white overflow-hidden">
      {/* Sidebar (chat list) */}
      <aside
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } w-full md:w-1/3 border-r border-gray-800 bg-black/40 backdrop-blur-md flex-col transition-all`}
      >
        <div className="p-4 border-b border-gray-800">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-600"
          />
        </div>

        <ul className="overflow-y-auto flex-1">
          {uniqueUsers
            .filter((msg) =>
              msg.content.toLowerCase().includes(search.toLowerCase())
            )
            .map((msg) => {
              const partnerId =
                msg.sender_id === authUser?.id
                  ? msg.recipient_id
                  : msg.sender_id;

              return (
                <li
                  key={msg.id}
                  onClick={() => handleSelect(partnerId)}
                  className="cursor-pointer p-4 border-b border-gray-800 hover:bg-gray-800/40 transition flex items-center space-x-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-pink-400 truncate">
                      {partnerId.slice(0, 10)}...
                    </h4>
                    <p className="text-sm text-gray-400 truncate">
                      {msg.content}
                    </p>
                  </div>
                </li>
              );
            })}
        </ul>
      </aside>

      {/* Chat View */}
      <main
        className={`${
          selectedUser ? "flex" : "hidden md:flex"
        } flex-1 bg-black/30 backdrop-blur-md flex-col`}
      >
        {selectedUser ? (
          <PrivateChatView
            currentUser={authUser}
            recipient={selectedUser}
            key={selectedUser.id}
            onBack={() => setSelectedUser(null)}
            isPaid={!!isPaid}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Select a chat to start messaging 💬</p>
          </div>
        )}
      </main>
    </div>
  );
}
