import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { getAuth } from "firebase/auth";

export default function SavedJobs() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [savedJobs, setSavedJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchSavedJobs();
    }
  }, [user]);

  const fetchSavedJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("user_saved_jobs")
        .select(
          `
          id,
          job_id,
          employer_jobs (
            title,
            location,
            salary,
            description,
            image_url
          )
        `
        )
        .eq("firebase_uid", user.uid);

      if (error) {
        console.error("Error fetching saved jobs:", error);
        return;
      }

      setSavedJobs(data);
    } catch (err) {
      console.error("Unexpected error fetching saved jobs:", err);
    }
  };

  const handleRemove = async (id) => {
    try {
      const { error } = await supabase
        .from("user_saved_jobs")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error removing job:", error);
        alert("Failed to remove saved job.");
        return;
      }

      setSavedJobs((prev) => prev.filter((job) => job.id !== id));
      alert("Job removed from saved jobs!");
    } catch (err) {
      console.error("Unexpected error removing job:", err);
    }
  };

  const filteredJobs = savedJobs.filter((saved) =>
    saved.employer_jobs.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          Saved Jobs
        </h1>
      </div>

      <div className="flex justify-center mb-8">
        <input
          type="text"
          placeholder="Search saved jobs by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[600px] text-lg p-3 border-2 border-[#FFD24C] rounded-full shadow focus:outline-none focus:ring-2 focus:ring-[#FFD24C]"
        />
      </div>

      {filteredJobs.length === 0 ? (
        <p className="text-[#555555] text-center">No saved jobs found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((saved) => {
            const job = saved.employer_jobs;
            return (
              <div
                key={saved.id}
                className="bg-white p-4 rounded shadow hover:shadow-lg transition border border-[#FFD24C]"
              >
                {job.image_url && (
                  <img
                    src={job.image_url}
                    alt={job.title}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <h2 className="text-lg font-semibold text-[#333333]">
                  {job.title}
                </h2>
                <p className="text-[#555555]">{job.description}</p>
                <p className="text-[#555555]">📍 {job.location}</p>
                <p className="text-[#555555]">💰 {job.salary}</p>

                <button
                  onClick={() => handleRemove(saved.id)}
                  className="mt-3 bg-red-400 text-white px-3 py-1 rounded hover:bg-red-500"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
