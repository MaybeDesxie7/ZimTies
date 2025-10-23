"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, Heart, MessageCircle, Activity, Settings } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Redirect to matches page if user lands on /dashboard
  useEffect(() => {
    if (pathname === "/dashboard") {
      router.replace("/dashboard/matches");
    }
  }, [pathname, router]);

  const navItems = [
    { href: "/dashboard/matches", label: "Matches", icon: Heart },
    { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
    { href: "/dashboard/activities", label: "Activities", icon: Activity },
    { href: "/dashboard/profile", label: "Profile", icon: User },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-yellow-400">
        <div className="flex justify-around items-center p-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center text-xs ${
                pathname === href ? "text-green-500" : "text-white"
              }`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
