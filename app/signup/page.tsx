"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();

  const interestsList = [
    "Sports","Music","Travel","Cooking","Reading","Gaming",
    "Fitness","Art","Dancing","Photography","Technology","Movies",
    "Fashion","Nature","Animals","Writing","Volunteering","Hiking",
    "Yoga","Meditation"
  ];

  const religionsList = [
    "Christianity","Islam","Hinduism","Buddhism","Traditional",
    "None","Judaism","Other"
  ];

  const provinces = [
    "Bulawayo","Harare","Manicaland","Mashonaland Central",
    "Mashonaland East","Mashonaland West","Masvingo",
    "Matabeleland North","Matabeleland South","Midlands"
  ];

  const [form, setForm] = useState({
    name: "", email: "", password: "", dob: "", gender: "",
    religion: "", province: "", bio: "", interests: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "interests") {
      let updated = [...form.interests];
      if (updated.includes(value)) updated = updated.filter(i => i !== value);
      else if (updated.length < 5) updated.push(value);
      setForm({ ...form, interests: updated });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.dob) return setError("Please select your date of birth.");
    const ageNum = calculateAge(form.dob);
    if (ageNum < 18) return setError("You must be at least 18 years old.");
    if (!form.gender) return setError("Please select your gender.");
    if (!form.bio || form.bio.trim().length < 30) return setError("Bio must be at least 30 characters.");
    if (form.interests.length === 0) return setError("Select at least 1 interest.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      // 1️⃣ Create Supabase Auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Signup failed.");

      const uid = signUpData.user.id;

      // 2️⃣ Insert into users table
      const { error: profileError } = await supabase.from("users").insert([{
        id: uid,
        name: form.name,
        dob: form.dob,
        gender: form.gender,
        religion: form.religion,
        province: form.province,
        bio: form.bio,
        interests: form.interests,
        gallery_images: [],
        premium: false,
      }]);
      if (profileError) throw profileError;

      // 3️⃣ Redirect to upload images
      router.push("/dashboard/upload-images");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center relative" style={{ backgroundImage: "url('/home.jpg')" }}>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative bg-white/30 backdrop-blur-lg border border-gray-300/50 p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-600 via-yellow-400 to-red-600">Create Your Account ❤️</h1>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSignUp} className="space-y-4">
          <input type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-300" required />
          <input type="email" name="email" placeholder="Email Address" value={form.email} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-300" required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-300" required />
          <input type="date" name="dob" value={form.dob} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-300" required />
          <select name="gender" value={form.gender} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-300" required>
            <option value="">Select Gender</option>
            {["Male","Female","Other","Prefer not to say"].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select name="religion" value={form.religion} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-300">
            <option value="">Select Religion</option>
            {religionsList.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select name="province" value={form.province} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-300">
            <option value="">Select Province</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <textarea name="bio" placeholder="Tell us about yourself..." value={form.bio} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-300" rows={4} required />
          <div className="grid grid-cols-2 gap-2">
            {interestsList.map(i => (
              <label key={i} className="flex items-center space-x-2">
                <input type="checkbox" name="interests" value={i} checked={form.interests.includes(i)} onChange={handleChange} />
                <span>{i}</span>
              </label>
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-600 via-yellow-400 to-red-600 text-white py-3 rounded-xl font-semibold shadow-lg">
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-200">
          Already have an account? <a href="/login" className="text-yellow-400 font-semibold hover:underline">Log In</a>
        </p>
      </div>
    </div>
  );
}
