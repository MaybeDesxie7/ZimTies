"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface Activity {
  id: string;
  type: "like" | "message" | "payment" | "profile_view";
  actor_id: string;
  actor_name?: string | null;
  actor_photo_url?: string | null;
  target_id: string | null;
  created_at: string;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let channels: any[] = [];

    const fetchUserMap = async (ids: string[]) => {
      if (!ids || ids.length === 0) return new Map<string, { name?: string; profile_pic?: string }>();
      const unique = Array.from(new Set(ids));
      const { data, error } = await supabase
        .from("users")
        .select("id, name, profile_pic")
        .in("id", unique);
      if (error) {
        console.error("Failed fetching users:", error);
        return new Map();
      }
      const m = new Map<string, { name?: string; profile_pic?: string }>();
      (data || []).forEach((u: any) => m.set(u.id, { name: u.name, profile_pic: u.profile_pic }));
      return m;
    };

    const transformRowsToActivities = (
      likes: any[],
      messages: any[],
      payments: any[],
      profileViews: any[],
      userMap: Map<string, { name?: string; profile_pic?: string }>
    ) => {
      const result: Activity[] = [];

      (likes || []).forEach((l: any) =>
        result.push({
          id: l.id,
          type: "like",
          actor_id: l.from_uid,
          actor_name: userMap.get(l.from_uid)?.name ?? null,
          actor_photo_url: userMap.get(l.from_uid)?.profile_pic ?? null,
          target_id: l.to_uid,
          created_at: l.created_at,
        })
      );

      (messages || []).forEach((m: any) =>
        result.push({
          id: m.id,
          type: "message",
          actor_id: m.sender_id,
          actor_name: userMap.get(m.sender_id)?.name ?? null,
          actor_photo_url: userMap.get(m.sender_id)?.profile_pic ?? null,
          target_id: m.recipient_id,
          created_at: m.created_at,
        })
      );

      (payments || []).forEach((p: any) =>
        result.push({
          id: p.id,
          type: "payment",
          actor_id: p.user_id,
          actor_name: userMap.get(p.user_id)?.name ?? null,
          actor_photo_url: userMap.get(p.user_id)?.profile_pic ?? null,
          target_id: p.user_id,
          created_at: p.created_at,
        })
      );

      (profileViews || []).forEach((v: any) =>
        result.push({
          id: v.id,
          type: "profile_view",
          actor_id: v.viewer_uid,
          actor_name: userMap.get(v.viewer_uid)?.name ?? null,
          actor_photo_url: userMap.get(v.viewer_uid)?.profile_pic ?? null,
          target_id: v.viewed_uid,
          created_at: v.created_at,
        })
      );

      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return result;
    };

    const subscribeToTable = (table: string, filter: string, handler: (payload: any) => void) => {
      const ch = supabase
        .channel(`realtime-${table}-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table, filter },
          (payload: any) => handler(payload)
        )
        .subscribe();

      channels.push(ch);
      return ch;
    };

    const fetchAndSubscribe = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!session?.user) {
          setUserId(null);
          setActivities([]);
          return;
        }
        const uid = session.user.id;
        setUserId(uid);

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("premium")
          .eq("id", uid)
          .maybeSingle();
        if (userError) throw userError;
        setIsPremium(userData?.premium ?? false);

        const [
          { data: likes },
          { data: messages },
          { data: payments },
          { data: profileViews },
        ] = await Promise.all([
          supabase.from("likes").select("id, from_uid, to_uid, created_at").eq("to_uid", uid),
          supabase.from("messages").select("id, sender_id, recipient_id, created_at").eq("recipient_id", uid),
          supabase.from("payments").select("id, user_id, amount, created_at").eq("user_id", uid),
          supabase.from("profile_views").select("id, viewer_uid, viewed_uid, created_at").eq("viewed_uid", uid),
        ]);

        const actorIds = [
          ...(likes || []).map((r: any) => r.from_uid),
          ...(messages || []).map((r: any) => r.sender_id),
          ...(payments || []).map((r: any) => r.user_id),
          ...(profileViews || []).map((r: any) => r.viewer_uid),
        ].filter(Boolean);

        const userMap = await fetchUserMap(actorIds);

        const initialActivities = transformRowsToActivities(
          likes || [],
          messages || [],
          payments || [],
          profileViews || [],
          userMap
        );
        setActivities(initialActivities);

        // subscriptions
        subscribeToTable("likes", `to_uid=eq.${uid}`, async (payload: any) => {
          const newRow = payload.new;
          const { data: actorData } = await supabase
            .from("users")
            .select("id, name, profile_pic")
            .eq("id", newRow.from_uid)
            .maybeSingle();
          setActivities(prev => [
            {
              id: newRow.id,
              type: "like",
              actor_id: newRow.from_uid,
              actor_name: actorData?.name ?? null,
              actor_photo_url: actorData?.profile_pic ?? null,
              target_id: newRow.to_uid,
              created_at: newRow.created_at,
            },
            ...prev,
          ]);
        });

        subscribeToTable("messages", `recipient_id=eq.${uid}`, async (payload: any) => {
          const newRow = payload.new;
          const { data: actorData } = await supabase
            .from("users")
            .select("id, name, profile_pic")
            .eq("id", newRow.sender_id)
            .maybeSingle();
          setActivities(prev => [
            {
              id: newRow.id,
              type: "message",
              actor_id: newRow.sender_id,
              actor_name: actorData?.name ?? null,
              actor_photo_url: actorData?.profile_pic ?? null,
              target_id: newRow.recipient_id,
              created_at: newRow.created_at,
            },
            ...prev,
          ]);
        });

        subscribeToTable("payments", `user_id=eq.${uid}`, async (payload: any) => {
          const newRow = payload.new;
          const { data: actorData } = await supabase
            .from("users")
            .select("id, name, profile_pic")
            .eq("id", newRow.user_id)
            .maybeSingle();
          setActivities(prev => [
            {
              id: newRow.id,
              type: "payment",
              actor_id: newRow.user_id,
              actor_name: actorData?.name ?? null,
              actor_photo_url: actorData?.profile_pic ?? null,
              target_id: newRow.user_id,
              created_at: newRow.created_at,
            },
            ...prev,
          ]);
        });

        subscribeToTable("profile_views", `viewed_uid=eq.${uid}`, async (payload: any) => {
          const newRow = payload.new;
          const { data: actorData } = await supabase
            .from("users")
            .select("id, name, profile_pic")
            .eq("id", newRow.viewer_uid)
            .maybeSingle();
          setActivities(prev => [
            {
              id: newRow.id,
              type: "profile_view",
              actor_id: newRow.viewer_uid,
              actor_name: actorData?.name ?? null,
              actor_photo_url: actorData?.profile_pic ?? null,
              target_id: newRow.viewed_uid,
              created_at: newRow.created_at,
            },
            ...prev,
          ]);
        });
      } catch (err: any) {
        console.error("Error fetching activities:", err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAndSubscribe();

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600">Please log in to view your activities.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600">Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <h1 className="text-2xl font-bold text-center text-green-700 mb-6">
        Your Recent Activities
      </h1>

      {activities.length === 0 ? (
        <p className="text-center text-gray-500">No activities yet 🚀</p>
      ) : (
        <ul className="space-y-4 max-w-2xl mx-auto">
          {activities.map((a) => {
            const isBlurred = a.type === "profile_view" && !isPremium;
            const actorName = a.actor_name || "Someone";
            return (
              <li
                key={`${a.type}-${a.id}`}
                className={`p-4 bg-white shadow-md rounded-lg flex items-center gap-3 sm:justify-between transition-all duration-300 ${
                  isBlurred ? "blur-sm grayscale" : ""
                }`}
              >
                {a.actor_photo_url ? (
                  <Image
                    src={a.actor_photo_url}
                    alt={actorName}
                    width={44}
                    height={44}
                    className="rounded-full object-cover cursor-pointer"
                    onClick={() => {
                      window.location.href = `/profile/${a.actor_id}`;
                    }}
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    👤
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.type === "like" && (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
                        ❤️ Like
                      </span>
                    )}
                    {a.type === "message" && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                        💬 Message
                      </span>
                    )}
                    {a.type === "profile_view" && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
                        👀 Viewed
                      </span>
                    )}
                    {a.type === "payment" && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                        💳 Payment
                      </span>
                    )}
                  </div>
                  <div className="text-gray-800 font-medium mt-1">
                    {a.type === "like" && `${actorName} liked your profile`}
                    {a.type === "message" && `New message from ${actorName}`}
                    {a.type === "profile_view" && `${actorName} viewed your profile`}
                    {a.type === "payment" && `Payment processed`}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
