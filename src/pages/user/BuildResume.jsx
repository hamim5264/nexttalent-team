import { useState } from "react";
import supabase from "../../supabaseClient";
import { getAuth } from "firebase/auth";

export default function BuildResume() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [resume, setResume] = useState({
    fullName: "",
    email: "",
    phone: "",
    profileImageUrl: "",
    portfolioLink: "",
    summary: "",
    skills: "",
    experience: "",
    education: "",
    projects: "",
  });

  const handleChange = (e) => {
    setResume({
      ...resume,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("User not authenticated!");
      return;
    }

    try {
      const { data: existingResume } = await supabase
        .from("user_resumes")
        .select("*")
        .eq("firebase_uid", user.uid)
        .single();

      if (existingResume) {
        await supabase
          .from("user_resumes")
          .update({ resume_data: resume })
          .eq("firebase_uid", user.uid);
        alert("Resume updated successfully!");
      } else {
        await supabase.from("user_resumes").insert([
          {
            firebase_uid: user.uid,
            resume_data: resume,
          },
        ]);
        alert("Resume created successfully!");
      }
    } catch (err) {
      console.error("Error saving resume:", err);
      alert("Failed to save resume.");
    }
  };

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          Build Your Resume
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-xl space-y-4 max-w-2xl mx-auto"
      >
        <InputField
          label="Full Name"
          name="fullName"
          value={resume.fullName}
          onChange={handleChange}
          required
        />
        <InputField
          label="Email"
          name="email"
          value={resume.email}
          onChange={handleChange}
          type="email"
          required
        />
        <InputField
          label="Phone"
          name="phone"
          value={resume.phone}
          onChange={handleChange}
        />
        <InputField
          label="Profile Image URL"
          name="profileImageUrl"
          value={resume.profileImageUrl}
          onChange={handleChange}
        />
        <InputField
          label="Portfolio Link"
          name="portfolioLink"
          value={resume.portfolioLink}
          onChange={handleChange}
          placeholder="https://yourportfolio.com"
        />

        <TextareaField
          label="Summary/About You"
          name="summary"
          value={resume.summary}
          onChange={handleChange}
        />
        <TextareaField
          label="Skills"
          name="skills"
          value={resume.skills}
          onChange={handleChange}
          placeholder="e.g. React, Node.js, Python"
        />
        <TextareaField
          label="Experience"
          name="experience"
          value={resume.experience}
          onChange={handleChange}
          placeholder="Describe your work experience"
        />
        <TextareaField
          label="Education"
          name="education"
          value={resume.education}
          onChange={handleChange}
          placeholder="Your education background"
        />
        <TextareaField
          label="Projects"
          name="projects"
          value={resume.projects}
          onChange={handleChange}
          placeholder="Mention your projects briefly"
        />

        <button
          type="submit"
          className="w-full bg-[#FFD24C] text-[#333333] font-semibold px-4 py-2 rounded hover:bg-[#FFE9B5] transition"
        >
          Save Resume
        </button>
      </form>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}) {
  return (
    <div>
      <label className="block text-[#333333] font-medium mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-2 border border-[#FFD24C] rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFD24C]"
        required={required}
      />
    </div>
  );
}

function TextareaField({ label, name, value, onChange, placeholder = "" }) {
  return (
    <div>
      <label className="block text-[#333333] font-medium mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        className="w-full p-2 border border-[#FFD24C] rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFD24C]"
        rows="3"
        placeholder={placeholder}
      />
    </div>
  );
}
