"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface UserData {
  id: string;
  name: string;
  age?: number;
  bio: string;
  profile_pic: string;
  gallery_images: string[];
  dob: string;
  gender: string;
  religion: string;
  province: string;
  interests: string[];
  badges: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<UserData>>({});
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);

  // ------------------------------
  // Fetch profile from Supabase
  // ------------------------------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: sessionData, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;

        const userId = sessionData?.session?.user?.id;
        if (!userId) throw new Error("Not logged in");

        const { data, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (userError) throw userError;
        if (!data) throw new Error("Profile not found");

        const age = data.dob ? new Date().getFullYear() - new Date(data.dob).getFullYear() : undefined;

        setUserData({
          ...data,
          age,
          badges: data.badges || [],
          interests: data.interests || [],
          gallery_images: data.gallery_images || [],
        });
        setForm({ ...data, age });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ------------------------------
  // Delete profile
  // ------------------------------
  const handleDeleteProfile = async () => {
    if (!confirm("Are you sure you want to delete your profile? This cannot be undone.")) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      // Delete storage files
      const folderPath = `users/${userId}`;
      const { data: files } = await supabase.storage.from("user-images").list(folderPath, { limit: 100 });
      if (files?.length) {
        const paths = files.map(f => `${folderPath}/${f.name}`);
        await supabase.storage.from("user-images").remove(paths);
      }

      // Delete user row
      await supabase.from("users").delete().eq("id", userId);
      await supabase.auth.signOut();
      router.push("/");
    } catch (err: any) {
      console.error("Delete error:", err.message);
      setError(err.message);
    }
  };

  // ------------------------------
  // Save profile changes
  // ------------------------------
  const handleSaveProfile = async () => {
    if (!userData) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      // Upload profile pic
      let profileUrl = userData.profile_pic;
      if (profileFile) {
        const { data, error: uploadError } = await supabase.storage
          .from("user-images")
          .upload(`users/${userId}/profile-${Date.now()}`, profileFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage.from("user-images").getPublicUrl(data.path);
        profileUrl = pub.publicUrl;
      }

      // Upload gallery images
      let galleryUrls = userData.gallery_images || [];
      if (galleryFiles && galleryFiles.length > 0) {
        for (let i = 0; i < galleryFiles.length && galleryUrls.length < 7; i++) {
          const file = galleryFiles[i];
          const { data, error: uploadError } = await supabase.storage
            .from("user-images")
            .upload(`users/${userId}/gallery-${Date.now()}-${i}`, file, { upsert: true });
          if (uploadError) throw uploadError;

          const { data: pub } = supabase.storage.from("user-images").getPublicUrl(data.path);
          galleryUrls.push(pub.publicUrl);
        }
      }

      const { error } = await supabase.from("users").update({
        ...form,
        profile_pic: profileUrl,
        gallery_images: galleryUrls,
      }).eq("id", userId);

      if (error) throw error;

      setUserData({ ...userData, ...form, profile_pic: profileUrl, gallery_images: galleryUrls });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ------------------------------
  // Delete gallery image
  // ------------------------------
  const handleDeleteImage = (idx: number) => {
    if (!userData) return;
    const updated = [...userData.gallery_images];
    updated.splice(idx, 1);
    setUserData({ ...userData, gallery_images: updated });
    setForm({ ...form, gallery_images: updated });
  };

  if (loading)
    return <div className="flex justify-center items-center h-screen text-gray-200">Loading profile...</div>;
  if (error)
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <div
      className="flex flex-col items-center text-center p-6 min-h-screen bg-cover bg-center relative"
      style={{ backgroundImage: "url('/home.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40 -z-10"></div>

      <div className="relative w-full max-w-md bg-white/30 backdrop-blur-lg border border-gray-300/50 p-6 rounded-3xl shadow-2xl">

        {/* Profile Header */}
        <ProfileHeader userData={userData} isEditing={isEditing} />

        {/* Gallery Section */}
        <GallerySection
          userData={userData}
          isEditing={isEditing}
          setGalleryFiles={setGalleryFiles}
          handleDeleteImage={handleDeleteImage}
        />

        {/* Personal Details */}
        <PersonalDetailsSection
          userData={userData}
          isEditing={isEditing}
          form={form}
          setForm={setForm}
        />

        {/* Actions */}
        <ActionButtons
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          handleSaveProfile={handleSaveProfile}
          handleDeleteProfile={handleDeleteProfile}
        />
      </div>
    </div>
  );
}

// ------------------------------
// Profile Header Component
// ------------------------------
function ProfileHeader({ userData, isEditing }: { userData: UserData | null; isEditing: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-32 h-32 mb-2 rounded-full overflow-hidden border-8 border-transparent shadow-xl"
        style={{ borderImage: "linear-gradient(45deg, green, yellow, red, black, white) 1" }}
      >
        <Image
          src={userData?.profile_pic ?? "/default-avatar.png"}
          alt="Profile"
          fill
          className="rounded-full object-cover"
        />
      </div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 bg-clip-text text-transparent">
        {userData?.name || "Your Name"}
      </h1>
      <p className="text-gray-100 mt-1">{userData?.age ? `${userData.age} years old` : "Age not set"}</p>

      {/* Badges */}
      {userData?.badges?.length ? (
        <div className="flex gap-2 mt-2 flex-wrap justify-center">
          {userData.badges.includes("trustworthy") && (
            <span className="px-3 py-1 bg-green-600/80 text-white text-sm rounded-full shadow-md">
              ✅ Trustworthy
            </span>
          )}
          {userData.badges.includes("loyal") && (
            <span className="px-3 py-1 bg-yellow-500/80 text-black text-sm rounded-full shadow-md">
              💌 Loyal
            </span>
          )}
        </div>
      ) : null}

      <p className="text-gray-200 italic mt-2 break-words whitespace-pre-line">
        {userData?.bio || "Tell others about yourself (min 30 characters)..."}
      </p>
    </div>
  );
}

// ------------------------------
// Gallery Section Component
// ------------------------------
function GallerySection({
  userData,
  isEditing,
  setGalleryFiles,
  handleDeleteImage,
}: {
  userData: UserData | null;
  isEditing: boolean;
  setGalleryFiles: React.Dispatch<React.SetStateAction<FileList | null>>;
  handleDeleteImage: (idx: number) => void;
}) {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-green-700 mb-2 text-left">Gallery</h2>
      <div className="flex space-x-3 overflow-x-auto py-2">
        {userData?.gallery_images.map((url, idx) => (
          <div key={idx} className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden shadow-md relative">
            <Image src={url} alt={`Gallery ${idx + 1}`} fill className="object-cover" />
            {isEditing && (
              <button
                onClick={() => handleDeleteImage(idx)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full px-1 text-xs"
              >
                −
              </button>
            )}
          </div>
        ))}
        {isEditing && (userData?.gallery_images.length ?? 0) < 7 && (
          <label className="w-24 h-24 flex-shrink-0 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer">
            +
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => setGalleryFiles(e.target.files)}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// ------------------------------
// Personal Details Section Component
// ------------------------------
function PersonalDetailsSection({
  userData,
  isEditing,
  form,
  setForm,
}: {
  userData: UserData | null;
  isEditing: boolean;
  form: Partial<UserData>;
  setForm: React.Dispatch<React.SetStateAction<Partial<UserData>>>;
}) {
  if (!isEditing) {
    return (
      <div className="mt-6 text-left">
        <h2 className="text-xl font-semibold text-green-700 mb-4">Personal Details</h2>
        <ul className="text-gray-100 space-y-2">
          <li><strong>Date of Birth:</strong> {userData?.dob || "Not set"}</li>
          <li><strong>Gender:</strong> {userData?.gender || "Not set"}</li>
          <li><strong>Religion:</strong> {userData?.religion || "Not set"}</li>
          <li><strong>Province:</strong> {userData?.province || "Not set"}</li>
          <li><strong>Interests:</strong> {userData?.interests?.join(", ") || "Not set"}</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-6 text-left space-y-3">
      <input type="text" placeholder="Name" value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 rounded-lg border" />
      <textarea placeholder="Bio" value={form.bio ?? ""} onChange={e => setForm({ ...form, bio: e.target.value })} className="w-full p-2 rounded-lg border resize-none" rows={3} />
      <input type="text" placeholder="Gender" value={form.gender ?? ""} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full p-2 rounded-lg border" />
      <input type="text" placeholder="Religion" value={form.religion ?? ""} onChange={e => setForm({ ...form, religion: e.target.value })} className="w-full p-2 rounded-lg border" />
      <input type="text" placeholder="Province" value={form.province ?? ""} onChange={e => setForm({ ...form, province: e.target.value })} className="w-full p-2 rounded-lg border" />
      <input type="text" placeholder="Interests (comma separated)" value={form.interests?.join(", ") ?? ""} onChange={e => setForm({ ...form, interests: e.target.value.split(",") })} className="w-full p-2 rounded-lg border" />
    </div>
  );
}

// ------------------------------
// Action Buttons Component
// ------------------------------
function ActionButtons({
  isEditing,
  setIsEditing,
  handleSaveProfile,
  handleDeleteProfile,
}: {
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveProfile: () => Promise<void>;
  handleDeleteProfile: () => Promise<void>;
}) {
  if (!isEditing) {
    return (
      <div className="mt-6 space-y-3">
        <button onClick={() => setIsEditing(true)} className="block w-full text-center bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:opacity-90 transform hover:scale-105 transition-all duration-300">Edit Profile</button>
        <button onClick={handleDeleteProfile} className="block w-full text-center bg-red-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-red-700 transform hover:scale-105 transition-all duration-300">Delete Profile</button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <button onClick={handleSaveProfile} className="block w-full text-center bg-green-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-300">Save Changes</button>
      <button onClick={() => setIsEditing(false)} className="block w-full text-center bg-gray-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-gray-700 transform hover:scale-105 transition-all duration-300">Cancel</button>
    </div>
  );
}
