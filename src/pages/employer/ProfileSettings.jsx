import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { getAuth } from "firebase/auth";

export default function ProfileSettings() {
  const [profile, setProfile] = useState({
    companyName: "",
    email: "",
    website: "",
    logoUrl: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("firebase_uid", user.uid)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setProfile({
          companyName: data.company_name || "",
          email: data.email || "",
          website: data.website || "",
          logoUrl: data.logo_url || "",
          description: data.description || "",
        });
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
    if (!user) return;

    try {
      const { data: existingProfile } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("firebase_uid", user.uid)
        .single();

      if (existingProfile) {
        const { error } = await supabase
          .from("employer_profiles")
          .update({
            company_name: profile.companyName,
            email: profile.email,
            website: profile.website,
            logo_url: profile.logoUrl,
            description: profile.description,
          })
          .eq("firebase_uid", user.uid);

        if (error) throw error;
        alert("Profile updated successfully!");
      } else {
        const { error } = await supabase.from("employer_profiles").insert([
          {
            firebase_uid: user.uid,
            company_name: profile.companyName,
            email: profile.email,
            website: profile.website,
            logo_url: profile.logoUrl,
            description: profile.description,
          },
        ]);

        if (error) throw error;
        alert("Profile created successfully!");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile.");
    }
  };

  if (loading) {
    return <p className="text-center text-[#555555]">Loading Profile...</p>;
  }

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          Profile Settings
        </h1>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white p-6 rounded shadow space-y-4 max-w-xl mx-auto"
      >
        <InputField
          label="Company Name"
          name="companyName"
          value={profile.companyName}
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
          label="Website"
          name="website"
          type="url"
          value={profile.website}
          onChange={handleChange}
        />
        <InputField
          label="Logo Image URL"
          name="logoUrl"
          type="url"
          value={profile.logoUrl}
          onChange={handleChange}
        />
        <TextareaField
          label="Company Description"
          name="description"
          value={profile.description}
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

function InputField({ label, name, type = "text", value, onChange, required }) {
  return (
    <div>
      <label className="block text-[#333333] font-medium mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full p-2 border rounded"
        required={required}
      />
    </div>
  );
}

function TextareaField({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-[#333333] font-medium mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        className="w-full p-2 border rounded"
        rows="4"
      />
    </div>
  );
}
