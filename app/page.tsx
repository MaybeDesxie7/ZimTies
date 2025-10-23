"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/home.jpg" // put your background image in public/home.jpg
          alt="Romantic Background"
          fill
          className="object-cover object-center brightness-75"
        />
      </div>

      {/* Header / Logo */}
      <header className="mb-12 flex items-center gap-2 animate-fade-in">
        {/* Logo with float animation */}
        <Image
          src="/logo.png" // put your logo image in public/logo.png
          alt="ZimSite Logo"
          width={100}
          height={100}
          className="rounded-full shadow-2xl object-contain animate-float"
        />

        {/* ZimSite Name with Zimbabwe flag colors */}
        <h1 className="text-6xl font-extrabold drop-shadow-lg flex gap-0 -ml-2">
          <span className="text-green-500">Z</span>
          <span className="text-yellow-400">i</span>
          <span className="text-red-600">m</span>
          <span className="text-black">T</span>
          <span className="text-white drop-shadow">i</span>
          <span className="text-green-500">e</span>
          <span className="text-yellow-400">s</span>
        </h1>
      </header>

      {/* Main Text */}
      <main className="text-center max-w-2xl px-6 animate-fade-in delay-200">
        <h2 className="text-white text-4xl md:text-5xl font-extrabold mb-6 drop-shadow-md">
          Find Love in Zimbabwe, One Swipe at a Time
        </h2>
        <p className="text-white text-lg md:text-xl mb-8 drop-shadow-sm">
          Meet singles, create connections, and discover your perfect match. Join
          ZimTies today and start your love story.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-pink-500 text-white px-8 py-4 rounded-lg font-semibold shadow-lg hover:bg-pink-600 transform hover:scale-105 transition-all duration-300"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="bg-white text-pink-500 px-8 py-4 rounded-lg font-semibold shadow-lg hover:bg-pink-50 transform hover:scale-105 transition-all duration-300"
          >
            Log In
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-4 text-white text-sm animate-fade-in delay-400">
        &copy; {new Date().getFullYear()} ZimTies. All rights reserved.
      </footer>

      {/* Animations */}
      <style jsx>{`
        .animate-fade-in {
          opacity: 0;
          animation: fadeIn 1s forwards;
        }
        .animate-fade-in.delay-200 {
          animation-delay: 0.2s;
        }
        .animate-fade-in.delay-400 {
          animation-delay: 0.4s;
        }

        /* Logo float animation */
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
