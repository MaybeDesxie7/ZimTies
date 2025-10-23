"use client";

import { useState } from "react";
import { db, storage } from "@/lib/supabase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function CreateProfile() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleCreate = async () => {
    try {
      let photoUrl: string[] = [];
      if (photoFile) {
        const storageRef = ref(storage, `profiles/${Date.now()}-${photoFile.name}`);
        await uploadBytes(storageRef, photoFile);
        const url = await getDownloadURL(storageRef);
        photoUrl = [url];
      }

      const docRef = await addDoc(collection(db, "profiles"), {
        displayName,
        bio,
        age: Number(age),
        gender,
        city,
        photos: photoUrl,
        isPremium: false,
        premiumExpires: null,
        createdAt: serverTimestamp(),
      });

      console.log("Profile created with ID:", docRef.id);
      alert("Profile created!");
      // Reset form
      setDisplayName("");
      setBio("");
      setAge("");
      setGender("");
      setCity("");
      setPhotoFile(null);
    } catch (error) {
      console.error("Error creating profile:", error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Create Profile</h1>
      <input placeholder="Name" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
      <input placeholder="Bio" value={bio} onChange={(e)=>setBio(e.target.value)} />
      <input type="number" placeholder="Age" value={age} onChange={(e)=>setAge(Number(e.target.value))} />
      <input placeholder="Gender" value={gender} onChange={(e)=>setGender(e.target.value)} />
      <input placeholder="City" value={city} onChange={(e)=>setCity(e.target.value)} />
      <input type="file" onChange={(e)=>setPhotoFile(e.target.files ? e.target.files[0] : null)} />
      <button onClick={handleCreate}>Create Profile</button>
    </div>
  );
}
