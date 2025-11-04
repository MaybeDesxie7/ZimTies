"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/**
 * MatchesPage — Final, fixed & polished
 *
 * - Shows all users except the current user (Option A).
 * - When all profiles are shown, automatically re-fetches fresh shuffled profiles from Supabase.
 * - "Refresh Now" forces a fresh fetch.
 * - Visual: Zimbabwean gradient, glows (gold = premium, emerald = regular).
 */

/* ----------------------------- Types ----------------------------- */
interface User {
  id: string;
  name?: string | null;
  dob?: string | null;
  bio?: string | null;
  profile_pic?: string | null;
  gallery_images?: string[] | null;
  premium?: boolean | null;
}

/* --------------------------- Helpers ------------------------------ */
const calculateAge = (dob?: string | null) => {
  if (!dob) return undefined;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const shuffleArray = <T,>(arr: T[]) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* --------------------------- Component ---------------------------- */
export default function MatchesPage() {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserPremium, setCurrentUserPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const actionLock = useRef(false);

  /* ------------------- Fetch profiles from Supabase ------------------ */
  const fetchProfiles = async (opts?: { shuffle?: boolean; force?: boolean }) => {
    if (!mountedRef.current) return;
    setFetching(true);
    setError(null);

    try {
      // get current session (fresh)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const uid = sessionData?.session?.user?.id;
      if (!uid) throw new Error("Not logged in");

      // save current uid
      setCurrentUserId(uid);

      // get user's premium status (best-effort)
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("premium")
          .eq("id", uid)
          .single();
        if (!userError) {
          setCurrentUserPremium(Boolean(userData?.premium));
        }
      } catch (err) {
        // ignore - we still proceed to fetch profiles
        console.warn("Could not fetch current user's premium status", err);
      }

      // fetch all other users (Option A). Force fresh network query by avoiding any client cache reliance.
      const { data: allUsers, error: usersError } = await supabase
        .from("users")
        .select("id, name, dob, bio, profile_pic, gallery_images, premium")
        .neq("id", uid);

      if (usersError) throw usersError;

      let arr = (allUsers || []) as User[];

      // shuffle for variety on each fetch
      if (opts?.shuffle !== false) {
        arr = shuffleArray(arr);
      }

      // set state
      setProfiles(arr);
      setCurrentIndex(0);
    } catch (err: any) {
      console.error("fetchProfiles error:", err);
      setError(err?.message || "Failed to load profiles");
      setProfiles([]);
      setCurrentIndex(0);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setFetching(false);
      }
    }
  };

  /* ---------------------- Initial mount & auth listener --------------------- */
  useEffect(() => {
    mountedRef.current = true;
    // initial fetch
    fetchProfiles({ shuffle: true });

    // subscribe to auth changes so switching account triggers a fresh fetch
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // whenever session changes, re-fetch fresh profiles
      // we delay slightly to allow Supabase session to fully settle
      setTimeout(() => {
        fetchProfiles({ shuffle: true, force: true });
      }, 150);
    });

    return () => {
      mountedRef.current = false;
      authListener?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- Like & Pass actions (keep tracking) ------------------- */
  const handleLike = async () => {
    if (actionLock.current) return;
    const profile = profiles[currentIndex];
    if (!currentUserId || !profile) return;

    actionLock.current = true;
    // optimistic move
    setCurrentIndex((s) => s + 1);

    try {
      // prevent duplicate likes
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("from_uid", currentUserId)
        .eq("to_uid", profile.id)
        .limit(1)
        .maybeSingle();

      if (!existingLike) {
        const { error: likeError } = await supabase.from("likes").insert([
          {
            from_uid: currentUserId,
            to_uid: profile.id,
          },
        ]);
        if (likeError) throw likeError;
      }

      // optionally record view if premium
      if (currentUserPremium) {
        const { data: existingView } = await supabase
          .from("profile_views")
          .select("id")
          .eq("viewer_uid", currentUserId)
          .eq("viewed_uid", profile.id)
          .limit(1)
          .maybeSingle();

        if (!existingView) {
          const { error: viewError } = await supabase.from("profile_views").insert([
            { viewer_uid: currentUserId, viewed_uid: profile.id },
          ]);
          if (viewError) console.warn("profile_views insert error:", viewError);
        }
      }
    } catch (err) {
      console.error("Error during like:", err);
    } finally {
      // unlock after animation window
      setTimeout(() => {
        actionLock.current = false;
      }, 300);
    }
  };

  const handlePass = async () => {
    if (actionLock.current) return;
    const profile = profiles[currentIndex];
    if (!currentUserId || !profile) return;

    actionLock.current = true;
    setCurrentIndex((s) => s + 1);

    try {
      // record view for premium users (best-effort)
      if (currentUserPremium) {
        const { data: existingView } = await supabase
          .from("profile_views")
          .select("id")
          .eq("viewer_uid", currentUserId)
          .eq("viewed_uid", profile.id)
          .limit(1)
          .maybeSingle();

        if (!existingView) {
          const { error: viewError } = await supabase.from("profile_views").insert([
            { viewer_uid: currentUserId, viewed_uid: profile.id },
          ]);
          if (viewError) console.warn("profile_views insert error:", viewError);
        }
      }
    } catch (err) {
      console.error("Error during pass:", err);
    } finally {
      setTimeout(() => {
        actionLock.current = false;
      }, 220);
    }
  };

  /* ------------------ When we reach the end: REFRESH (Option B) ------------------ */
  useEffect(() => {
    if (profiles.length === 0) {
      // nothing available currently — we won't auto-refetch aggressively, but user can Refresh Now
      return;
    }

    if (currentIndex >= profiles.length) {
      // we've iterated over the current list — fetch fresh set from server
      fetchProfiles({ shuffle: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, profiles.length]);

  /* ---------------------- Keyboard shortcuts ---------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePass();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        handleLike();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, profiles, currentUserId, currentUserPremium]);

  /* ------------------- Current profile derived values ------------------ */
  const currentProfile = useMemo(() => profiles[currentIndex], [profiles, currentIndex]);
  const displayPhoto =
    currentProfile?.profile_pic || currentProfile?.gallery_images?.[0] || "/default-avatar.png";

  /* ----------------------------- UI --------------------------------- */
  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{
        // Zimbabwean gradient backdrop (subtle)
        background: "linear-gradient(180deg, rgba(0,122,61,0.06) 0%, rgba(252,209,22,0.04) 40%, rgba(206,17,38,0.03) 75%, #000000 100%)",
        color: "#0b0b0b",
      }}
    >
      <header className="w-full max-w-3xl text-center mb-8">
        <h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2"
          style={{ color: "#CE1126", textShadow: "0 4px 18px rgba(0,0,0,0.35)" }}
        >
          Discover Zimbabwean Matches 🇿🇼
        </h1>
        <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto">
          Browse everyone (except you). The feed refreshes automatically when you reach the end.
        </p>
      </header>

      <main className="w-full max-w-xl flex-1 flex flex-col items-center">
        <div className="relative w-full flex justify-center">
          {/* ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{
              filter: "blur(60px)",
              background:
                "radial-gradient(ellipse at center, rgba(0,122,61,0.12), rgba(252,209,22,0.06), rgba(206,17,38,0.06), transparent)",
              mixBlendMode: "screen",
            }}
          />

          {/* Loading */}
          {loading || fetching ? (
            <div className="w-80 sm:w-[420px] h-[520px] rounded-3xl bg-white/80 backdrop-blur-md flex flex-col items-center justify-center shadow-2xl">
              <div className="animate-pulse w-32 h-32 rounded-full bg-gray-200 mb-6" />
              <p className="text-gray-600">⏳ Loading profiles...</p>
              <p className="text-xs text-gray-500 mt-2">Fetching the latest list from the server...</p>
            </div>
          ) : !currentProfile ? (
            // No profiles (e.g., only user in DB)
            <div className="w-80 sm:w-[420px] h-[420px] rounded-3xl bg-white p-6 flex flex-col items-center justify-center shadow-2xl">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No other users found</h2>
              <p className="text-sm text-gray-600 mb-4 text-center">
                We couldn't find other users right now. Press refresh to query the server again.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => fetchProfiles({ shuffle: true })}
                  className="px-4 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 shadow"
                >
                  🔄 Refresh Now
                </button>
              </div>
            </div>
          ) : (
            // Main card
            <AnimatePresence mode="wait">
              <motion.div
                key={currentProfile.id}
                initial={{ opacity: 0, scale: 0.98, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="relative w-80 sm:w-[420px] bg-white rounded-3xl shadow-2xl p-5 flex flex-col items-center"
                style={{
                  border: "1px solid rgba(0,0,0,0.06)",
                  overflow: "hidden",
                }}
              >
                {/* Image container */}
                <div
                  className="rounded-xl overflow-hidden mb-4 relative"
                  style={{
                    width: "100%",
                    height: "320px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
                    borderRadius: 20,
                  }}
                >
                  {/* glowing ring based on premium */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 18,
                      boxShadow: currentProfile.premium
                        ? "0 0 40px 6px rgba(255,200,60,0.18), 0 8px 30px rgba(206,17,38,0.06)"
                        : "0 0 40px 6px rgba(16,185,129,0.12), 0 8px 30px rgba(0,0,0,0.06)",
                      pointerEvents: "none",
                    }}
                  />

                  <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 220 }} className="absolute inset-0">
                    <Image
                      src={displayPhoto}
                      alt={currentProfile.name || "Profile"}
                      fill
                      sizes="(max-width: 640px) 80vw, 420px"
                      style={{ objectFit: "cover", borderRadius: 18 }}
                    />
                  </motion.div>

                  {/* Inner glow bar */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      bottom: 14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "70%",
                      height: 16,
                      borderRadius: 9999,
                      filter: "blur(12px)",
                      background: currentProfile.premium
                        ? "linear-gradient(90deg, rgba(255,205,96,0.55), rgba(255,180,40,0.35))"
                        : "linear-gradient(90deg, rgba(16,185,129,0.45), rgba(6,95,70,0.25))",
                      opacity: 0.7,
                    }}
                  />
                </div>

                {/* Meta */}
                <div className="w-full text-left px-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {currentProfile.name || "Unknown"}
                        {currentProfile.premium ? <span className="ml-2 text-sm text-yellow-600 font-medium">💎</span> : null}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{calculateAge(currentProfile.dob) ? `${calculateAge(currentProfile.dob)} yrs` : "Age not set"}</p>
                    </div>

                    <div className="text-right text-xs text-gray-500">
                      <div className="bg-black/5 px-3 py-1 rounded-full">{currentIndex + 1} / {Math.max(profiles.length, 1)}</div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 italic mt-3 line-clamp-3">{currentProfile.bio || "No bio provided."}</p>
                </div>

                {/* Actions */}
                <div className="w-full flex items-center justify-between mt-5 gap-4 px-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handlePass}
                    className="flex-1 py-3 rounded-full text-white font-semibold shadow-lg"
                    style={{
                      background: "linear-gradient(90deg, #f97373, #ef4444)",
                      boxShadow: "0 8px 24px rgba(239,68,68,0.24)",
                    }}
                    aria-label="Pass"
                  >
                    ❌ Pass
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleLike}
                    className="flex-1 py-3 rounded-full text-white font-semibold shadow-lg"
                    style={{
                      background: "linear-gradient(90deg, #10b981, #059669)",
                      boxShadow: "0 8px 24px rgba(6,95,70,0.22)",
                    }}
                    aria-label="Like"
                  >
                    ❤️ Like
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer controls */}
        <div className="w-full max-w-xl mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchProfiles({ shuffle: true })}
              className="px-4 py-2 rounded-full bg-black text-white font-medium shadow hover:opacity-90"
            >
              🔄 Refresh Now
            </button>

            <button
              onClick={() => {
                // reset to start of current list
                setCurrentIndex(0);
              }}
              className="px-4 py-2 rounded-full bg-white border border-black/10 font-medium shadow hover:opacity-95"
            >
              ↺ Restart Cycle
            </button>
          </div>

          <p className="text-xs text-gray-600">
            Tip: Use ← to pass, → or Space to like. The feed automatically fetches fresh profiles when you finish the list.
          </p>

          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      </main>

      <footer className="w-full max-w-3xl mt-12 mb-8 text-center text-xs text-gray-500">
        Crafted with ❤️ for Zimbabwe — green • yellow • red.
      </footer>

      {/* subtle overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: "linear-gradient(90deg, rgba(0,122,61,0.02), rgba(252,209,22,0.02), rgba(206,17,38,0.02))",
          mixBlendMode: "overlay",
          opacity: 0.6,
        }}
      />
    </div>
  );
}
