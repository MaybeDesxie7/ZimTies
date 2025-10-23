"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PaymentsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const USD_PRICE = 2.99;
  const ZWL_PRICE = 105;

  // Fetch current user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      setCurrentUser(user);

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileError && profile) setCurrentUser(profile);
    };

    fetchUser();
  }, []);

  const handlePaymentSuccess = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          premium: true,
          premium_since: new Date().toISOString()
        })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setCurrentUser({ ...currentUser, premium: true });
    } catch (err: any) {
      console.error(err);
      setError("Failed to upgrade. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    // For sandbox/manual payments:
    // 1. Direct user to pay via EcoCash / InnBucks.
    // 2. After confirmation, call handlePaymentSuccess() manually.
    handlePaymentSuccess();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-6">
        Upgrade to Premium 🇿🇼
      </h1>

      <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-lg space-y-4">
        <p className="text-gray-700 text-center">
          Become a premium member and unlock these benefits:
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>See who liked your profile</li>
          <li>See who viewed your profile</li>
          <li>Full chat access with other members</li>
        </ul>

        <div className="bg-green-50 p-4 rounded-xl mt-4 text-center">
          <p className="font-semibold text-green-800">Subscription Amount:</p>
          <p className="text-xl font-bold text-green-900">
            ${USD_PRICE.toFixed(2)} USD / ZWL {ZWL_PRICE}
          </p>
        </div>

        {success ? (
          <p className="text-green-700 font-semibold text-center mt-4">
            🎉 You are now a premium member!
          </p>
        ) : (
          <>
            {error && (
              <p className="text-red-500 text-center font-medium">{error}</p>
            )}

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition transform hover:scale-105 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Pay & Upgrade"}
            </button>

            <p className="text-gray-500 text-center mt-2 text-sm">
              You will be redirected to complete payment via EcoCash / InnBucks.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
