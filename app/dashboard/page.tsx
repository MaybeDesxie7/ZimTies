"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/login"); // redirect if not logged in
      } else {
        setUser(user);

        // Redirect after short delay to Matches page
        setTimeout(() => {
          router.replace("/dashboard/matches");
        }, 2000); // 2 seconds splash
      }
    };

    fetchUser();

    // Optional: Listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push("/login");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (!user) {
    return <p className="text-center mt-10 text-white">Loading...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      {/* Logo */}
      <div className="relative w-40 h-40 mb-6">
        <div className="absolute inset-0 rounded-full border-8 border-green-600 animate-pulse"></div>
        <div className="absolute inset-1 rounded-full border-8 border-yellow-400 animate-ping"></div>
        <div className="absolute inset-2 rounded-full border-8 border-red-600"></div>
        <Image
          src="/logo.png" // make sure logo.png exists in public/
          alt="Glimo Logo"
          fill
          className="object-contain rounded-full border-4 border-white bg-black"
        />
      </div>

      {/* Greeting */}
      <h1 className="text-4xl font-bold">Hie 👋</h1>
      <p className="text-gray-300 mt-2">Good to see you!</p>
    </div>
  );
}
