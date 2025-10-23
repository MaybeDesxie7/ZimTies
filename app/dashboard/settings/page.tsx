"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const settings = [
    {
      category: "Profile",
      options: [
        {
          name: "Edit Profile",
          description: "Change your display name, bio, and photo.",
          action: () => router.push("/dashboard/profile"),
        },
      ],
    },
    {
      category: "Privacy",
      options: [
        {
          name: "Account Visibility",
          description: "Control who can view your profile.",
        },
        {
          name: "Blocked Users",
          description: "Manage users you’ve blocked.",
        },
      ],
    },
    {
      category: "Notifications",
      options: [
        {
          name: "Email Alerts",
          description: "Receive updates and offers via email.",
        },
        {
          name: "App Notifications",
          description: "Manage in-app alerts and push messages.",
        },
      ],
    },
    {
      category: "Account",
      options: [
        {
          name: "Change Password",
          description: "Update your account password securely.",
        },
        {
          name: "Logout",
          description: "Sign out of your account.",
          action: async () => {
            await supabase.auth.signOut();
            router.push("/");
          },
        },
      ],
    },
  ];

  // Filter by search
  const filtered = settings
    .map((s) => ({
      ...s,
      options: s.options.filter((opt) =>
        opt.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((s) => s.options.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 bg-clip-text text-transparent">
          Settings
        </h1>

        {/* 🔍 Search bar */}
        <input
          type="text"
          placeholder="Search settings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 mb-6 rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
        />

        {/* ⚙️ Settings sections */}
        {filtered.length > 0 ? (
          filtered.map((section, i) => (
            <div key={i} className="mb-8">
              <h2 className="text-lg font-semibold text-yellow-400 mb-3">
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.options.map((opt, j) => (
                  <div
                    key={j}
                    className="flex justify-between items-center p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-yellow-400 transition-all duration-200"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-100">
                        {opt.name}
                      </h3>
                      <p className="text-sm text-gray-400">{opt.description}</p>
                    </div>
                    {opt.action && (
                      <button
                        onClick={opt.action}
                        className="bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
                      >
                        Open
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-8">
            No matching settings found.
          </p>
        )}
      </div>
    </div>
  );
}
