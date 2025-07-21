import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import supabase from "../../supabaseClient";

export default function UserSettings() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    profileImageUrl: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("firebase_uid", user.uid)
        .single();

      if (data) {
        setProfile({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          profileImageUrl: data.profile_image_url || "",
        });
      } else if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("firebase_uid", user.uid)
        .single();

      if (existingProfile) {
        await supabase
          .from("user_profiles")
          .update({
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            profile_image_url: profile.profileImageUrl,
          })
          .eq("firebase_uid", user.uid);

        alert("Profile updated successfully!");
      } else {
        await supabase.from("user_profiles").insert([
          {
            firebase_uid: user.uid,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            profile_image_url: profile.profileImageUrl,
          },
        ]);
        alert("Profile created successfully!");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile.");
    }
  };

  if (loading) {
    return <p className="text-center">Loading profile...</p>;
  }

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          Account Settings
        </h1>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white p-6 rounded shadow space-y-4 max-w-xl mx-auto"
      >
        <InputField
          label="Name"
          name="name"
          value={profile.name}
          onChange={handleChange}
          required
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          value={profile.email}
          onChange={handleChange}
          required
        />
        <InputField
          label="Phone"
          name="phone"
          value={profile.phone}
          onChange={handleChange}
        />
        <InputField
          label="Profile Image URL"
          name="profileImageUrl"
          value={profile.profileImageUrl}
          onChange={handleChange}
        />

        <button
          type="submit"
          className="bg-[#FFD24C] text-[#333333] font-semibold px-4 py-2 rounded hover:bg-[#FFE9B5] w-full"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}

function InputField({ label, name, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="block text-[#333333] font-medium mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full p-2 border rounded mt-1"
        required={required}
      />
    </div>
  );
}
