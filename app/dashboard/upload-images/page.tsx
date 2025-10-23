"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FiPlus } from "react-icons/fi";

export default function UploadImagesPage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setProfilePic(e.target.files[0]);
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).filter(
      (f) => !galleryImages.some((img) => img.name === f.name)
    );
    setGalleryImages((prev) => [...prev, ...newFiles].slice(0, 3));
  };

  const uploadFile = async (file: File, path: string) => {
    const { error: uploadError } = await supabase.storage
      .from("user-images")
      .upload(path, file, { upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
    const { data } = supabase.storage.from("user-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUpload = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!profilePic) throw new Error("Profile picture is required.");

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      const uid = sessionData?.session?.user?.id;
      if (!uid) throw new Error("You must be logged in.");

      const profileUrl = await uploadFile(profilePic, `users/${uid}/profile-${Date.now()}.jpg`);
      const galleryUrls = await Promise.all(
        galleryImages.map((file, i) =>
          uploadFile(file, `users/${uid}/gallery-${Date.now()}-${i}.jpg`)
        )
      );

      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_pic: profileUrl, gallery_images: galleryUrls })
        .eq("id", uid);

      if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-green-600 via-yellow-400 to-red-600 bg-clip-text text-transparent">
        Upload Your Profile & Gallery
      </h1>

      <div className="w-full max-w-md space-y-6">
        {/* Profile Picture */}
        <div className="bg-white p-6 rounded-2xl shadow-md border text-center">
          <h2 className="text-lg font-semibold mb-3">Profile Picture (Required)</h2>
          <label className="cursor-pointer inline-block">
            {profilePic ? (
              <img
                src={URL.createObjectURL(profilePic)}
                alt="Profile preview"
                className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-green-600"
              />
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto border-4 border-dashed border-gray-400 flex items-center justify-center text-gray-400 text-4xl">
                <FiPlus />
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleProfileChange} />
          </label>
        </div>

        {/* Gallery */}
        <div className="bg-white p-6 rounded-2xl shadow-md border">
          <h2 className="text-lg font-semibold mb-3">Gallery (Max 3)</h2>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, idx) => {
              const file = galleryImages[idx];
              return (
                <label key={idx} className="cursor-pointer">
                  {file ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Gallery ${idx + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border-2 border-green-600"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-400 text-3xl">
                      <FiPlus />
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleGalleryChange} />
                </label>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-green-600 via-yellow-400 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:scale-105 transition disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload & Continue"}
        </button>

        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
      </div>
    </div>
  );
}
