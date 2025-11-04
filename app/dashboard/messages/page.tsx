"use client";

import { useEffect, useMemo, useState } from "react";
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
  name: string;
  profile_pic?: string | null;
  premium?: boolean | null;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [search, setSearch] = useState("");
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  // 1. Get authenticated user
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

  // 2. Check payment status
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

      if (!error && data && data.length > 0) setIsPaid(true);
      else setIsPaid(false);
    };

    checkPaid();
  }, [authUser]);

  // 3. Fetch messages for current user & subscribe to realtime inserts
  useEffect(() => {
    if (!authUser?.id) return;
    let isMounted = true;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${authUser.id},recipient_id.eq.${authUser.id}`)
        .order("created_at", { ascending: false });

      if (!error && data && isMounted) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Real-time listener for new messages
    const channel = supabase
      .channel("messages_inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
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

  // 4. Derive recent unique chat partners (ordered by latest message)
  const uniqueUsers = useMemo(() => {
    if (!authUser) return [] as Message[];

    const map = new Map<string, Message>();
    for (const msg of messages) {
      const partnerId = msg.sender_id === authUser.id ? msg.recipient_id : msg.sender_id;
      // keep latest message (messages are ordered desc by created_at)
      if (!map.has(partnerId)) {
        map.set(partnerId, msg);
      }
    }
    return Array.from(map.values());
  }, [messages, authUser]);

  // 5. Fetch profiles for the unique partners (Option A requirement)
  useEffect(() => {
    const loadProfiles = async () => {
      const partnerIds = uniqueUsers.map((m) =>
        m.sender_id === authUser?.id ? m.recipient_id : m.sender_id
      );
      // only fetch those not already present
      const idsToFetch = partnerIds.filter((id) => !profiles[id]);

      if (idsToFetch.length === 0) return;

      const { data, error } = await supabase
        .from("users")
        .select("id, name, profile_pic, premium")
        .in("id", idsToFetch);

      if (!error && data) {
        const nextProfiles = { ...profiles };
        for (const p of data) {
          nextProfiles[p.id] = {
            id: p.id,
            name: p.name || `User ${p.id.slice(0, 6)}`,
            profile_pic: p.profile_pic || null,
            premium: p.premium ?? null,
          };
        }
        setProfiles(nextProfiles);
      }
    };

    if (uniqueUsers.length > 0 && authUser) {
      loadProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueUsers, authUser]);

  // 6. Handle chat selection (resolve profile from fetched profiles)
  const handleSelect = (partnerId: string) => {
    if (!authUser) return;

    const profile = profiles[partnerId];
    if (profile) {
      setSelectedUser(profile);
    } else {
      // fallback: set minimal profile until it loads
      setSelectedUser({
        id: partnerId,
        name: `User ${partnerId.slice(0, 6)}`,
        profile_pic: `https://ui-avatars.com/api/?name=User${partnerId.slice(0, 6)}`,
      });
      // trigger fetch of missing profile (best-effort)
      (async () => {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, profile_pic, premium")
          .eq("id", partnerId)
          .limit(1)
          .single();
        if (!error && data) {
          setProfiles((prev) => ({
            ...prev,
            [data.id]: {
              id: data.id,
              name: data.name || `User ${data.id.slice(0, 6)}`,
              profile_pic: data.profile_pic || null,
              premium: data.premium ?? null,
            },
          }));
          setSelectedUser({
            id: data.id,
            name: data.name || `User ${data.id.slice(0, 6)}`,
            profile_pic: data.profile_pic || null,
            premium: data.premium ?? null,
          });
        }
      })();
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen text-white"
        style={{
          // Zimbabwean gradient background when loading too
          background: "linear-gradient(135deg,#007A3D 0%, #FCD116 35%, #CE1126 70%, #000 100%)",
        }}
      >
        <p>Loading messages...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div
        className="flex items-center justify-center h-screen text-white"
        style={{
          background: "linear-gradient(135deg,#007A3D 0%, #FCD116 35%, #CE1126 70%, #000 100%)",
        }}
      >
        <p>Please log in to access messages.</p>
      </div>
    );
  }

  // 7. Render UI
  return (
    <div
      className="flex h-screen text-white overflow-hidden"
      style={{
        // big Zimbabwean gradient background for the whole page
        background: "linear-gradient(135deg,#007A3D 0%, #FCD116 35%, #CE1126 70%, #000 100%)",
      }}
    >
      {/* Sidebar (chat list) */}
      <aside
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } w-full md:w-1/3 border-r border-black/40 bg-black/10 backdrop-blur-md flex-col transition-all`}
      >
        <div className="p-4 border-b border-black/30">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/60 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-300"
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

              const profile = profiles[partnerId];
              const displayName =
                profile?.name || `User ${partnerId.slice(0, 6)}`;
              const avatar =
                profile?.profile_pic ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

              return (
                <li
                  key={msg.id}
                  onClick={() => handleSelect(partnerId)}
                  className="cursor-pointer p-4 border-b border-black/20 hover:bg-black/20 transition flex items-center space-x-3"
                >
                  <img
                    src={avatar}
                    className="w-10 h-10 rounded-full object-cover border border-black/30"
                    alt={displayName}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-black/90 truncate">
                      {displayName}
                    </h4>
                    <p className="text-sm text-black/60 truncate">
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
        } flex-1 bg-black/5 backdrop-blur-md flex-col`}
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
          <div className="flex items-center justify-center h-full text-black/60">
            <p>Select a chat to start messaging 💬</p>
          </div>
        )}
      </main>
    </div>
  );
}
