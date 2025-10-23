"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  id: string;
  name?: string;
  dob?: string;
  bio?: string;
  profile_pic?: string;
  gallery_images?: string[];
  premium?: boolean;
}

export default function MatchesPage() {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserPremium, setCurrentUserPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const calculateAge = (dob?: string) => {
    if (!dob) return undefined;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);

        // Current user session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const uid = sessionData?.session?.user?.id;
        if (!uid) throw new Error("Not logged in");
        setCurrentUserId(uid);

        // Premium status
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("premium")
          .eq("id", uid)
          .single();
        if (userError) throw userError;
        setCurrentUserPremium(userData?.premium ?? false);

        // Fetch other users
        const { data: allUsers, error: usersError } = await supabase
          .from("users")
          .select("id, name, dob, bio, profile_pic, gallery_images, premium")
          .neq("id", uid);
        if (usersError) throw usersError;

        setProfiles(allUsers || []);
      } catch (err) {
        console.error("Error fetching profiles:", err);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleLike = async () => {
    if (!currentUserId || !profiles[currentIndex]) return;
    const currentProfile = profiles[currentIndex];

    try {
      // Avoid duplicate likes manually
      const { data: existing } = await supabase
        .from("likes")
        .select("*")
        .eq("from_uid", currentUserId)
        .eq("to_uid", currentProfile.id)
        .single();
      if (!existing) {
        const { error: likeError } = await supabase.from("likes").insert([{
          from_uid: currentUserId,
          to_uid: currentProfile.id
        }]);
        if (likeError) throw likeError;
      }

      // Insert profile view for premium users
      if (currentUserPremium) {
        const { data: existingView } = await supabase
          .from("profile_views")
          .select("*")
          .eq("viewer_uid", currentUserId)
          .eq("viewed_uid", currentProfile.id)
          .single();
        if (!existingView) {
          const { error: viewError } = await supabase.from("profile_views").insert([{
            viewer_uid: currentUserId,
            viewed_uid: currentProfile.id
          }]);
          if (viewError) throw viewError;
        }
      }

      setCurrentIndex(prev => prev + 1);
    } catch (err: any) {
      console.error("Error liking profile:", err.message || err);
      setCurrentIndex(prev => prev + 1); // still move on
    }
  };

  const handlePass = async () => {
    if (!currentUserId || !profiles[currentIndex]) return;
    const currentProfile = profiles[currentIndex];

    try {
      // For premium users, insert view
      if (currentUserPremium) {
        const { data: existingView } = await supabase
          .from("profile_views")
          .select("*")
          .eq("viewer_uid", currentUserId)
          .eq("viewed_uid", currentProfile.id)
          .single();
        if (!existingView) {
          const { error: viewError } = await supabase.from("profile_views").insert([{
            viewer_uid: currentUserId,
            viewed_uid: currentProfile.id
          }]);
          if (viewError) throw viewError;
        }
      }

      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error("Error passing profile:", err);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const currentProfile = profiles[currentIndex];
  const displayPhoto = currentProfile?.profile_pic || currentProfile?.gallery_images?.[0] || "/default-avatar.png";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-gradient-to-b from-green-100 via-yellow-50 to-orange-100">
      <h1 className="text-4xl font-extrabold text-center text-red-600 drop-shadow mb-6 animate-bounce">Discover Zimbabwean Matches 🇿🇼</h1>

      {loading ? (
        <p className="text-gray-700 text-lg animate-pulse">⏳ Loading profiles...</p>
      ) : currentProfile ? (
        <AnimatePresence>
          <motion.div
            key={currentProfile.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="relative bg-white p-6 rounded-3xl shadow-2xl w-80 text-center"
          >
            <Image
              src={displayPhoto}
              alt="Profile"
              width={250}
              height={250}
              className="rounded-xl object-cover mx-auto mb-4 shadow-lg border-4 border-green-400"
            />
            <h2 className="text-2xl font-bold text-green-700">{currentProfile.name || "Unknown User"}</h2>
            <p className="text-gray-700 mb-2">{calculateAge(currentProfile.dob) ? `${calculateAge(currentProfile.dob)} yrs` : "Age not set"}</p>
            <p className="text-gray-600 italic">{currentProfile.bio || "No bio available"}</p>

            <div className="flex justify-around mt-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95, rotate: -10 }}
                onClick={handlePass}
                className="bg-red-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-red-600"
              >
                ❌ Pass
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95, rotate: 10 }}
                onClick={handleLike}
                className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-600"
              >
                ❤️ Like
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <p className="text-black font-medium mt-12 text-xl animate-pulse">🎉 You’ve seen all profiles for now. Come back later!</p>
      )}
    </div>
  );
}
