"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Dummy test users
const TEST_USERS = [
  { id: "4ec1b0af-627c-4f42-8b59-9616c2dc0616", name: "Alice" },
  { id: "705f2805-2981-4514-bdaa-0b87755785bf", name: "Bob" },
  { id: "365787dc-1486-4c0b-871b-375338d7dd50", name: "Charlie" },
  { id: "208b56a9-f938-4218-b8bb-491cebf27601", name: "Diana" },
  { id: "1a2b3c4d-5e6f-7890-abcd-ef1234567890", name: "Eve" },
];

// Generate random timestamp within last 7 days
const randomTimestamp = () => {
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
};

// Random activity type
const activityTypes: ("like" | "profile_view" | "message")[] = [
  "like",
  "profile_view",
  "message",
];

export default function TestActivitiesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const createDummyActivities = async () => {
    setLoading(true);
    setMessage("");

    try {
      for (let i = 0; i < 20; i++) {
        // Random actor and target (ensure not same)
        let actorIndex = Math.floor(Math.random() * TEST_USERS.length);
        let targetIndex;
        do {
          targetIndex = Math.floor(Math.random() * TEST_USERS.length);
        } while (targetIndex === actorIndex);

        const actor = TEST_USERS[actorIndex];
        const target = TEST_USERS[targetIndex];
        const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const created_at = randomTimestamp().toISOString();

        // Insert activity based on type
        try {
          if (type === "like") {
            await supabase.from("likes").insert([{ from_uid: actor.id, to_uid: target.id, created_at }]);
          } else if (type === "profile_view") {
            await supabase
              .from("profile_views")
              .insert([{ viewer_uid: actor.id, viewed_uid: target.id, created_at }]);
          } else if (type === "message") {
            await supabase
              .from("messages")
              .insert({
                sender_id: actor.id,
                recipient_id: target.id,
                content: `Hello from ${actor.name}!`,
                created_at,
              });
          }
        } catch (err) {
          console.warn(`Skipping duplicate or failed ${type} activity`, err);
        }
      }

      setMessage("✅ 20 dummy activities created successfully!");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to create dummy activities. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6 text-green-700">
        Dummy Activity Generator
      </h1>

      <button
        onClick={createDummyActivities}
        disabled={loading}
        className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-600 transition"
      >
        {loading ? "Creating activities..." : "Create Dummy Activities"}
      </button>

      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
}
