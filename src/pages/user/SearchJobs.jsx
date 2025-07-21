import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { getAuth } from "firebase/auth";
import { Heart, HeartFill } from "react-bootstrap-icons"; // Install react-bootstrap-icons if not yet
import {
  notifySpecificUser,
  notifyRole,
  notifyAllUsers,
  notifyAdmin,
} from "../../services/notificationService";

export default function SearchJobs() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeLink, setResumeLink] = useState("");
  const [appliedJobs, setAppliedJobs] = useState({});
  const [savedJobs, setSavedJobs] = useState({});

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchAppliedJobs();
      fetchSavedJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from("employer_jobs")
        .select("*")
        .eq("status", "Approved")
        .eq("job_status", "Open");

      if (jobsError) throw jobsError;

      const jobsWithEmployer = await Promise.all(
        jobsData.map(async (job) => {
          const { data: employerData } = await supabase
            .from("employer_profiles")
            .select("company_name, email")
            .eq("firebase_uid", job.firebase_uid)
            .single();

          return {
            ...job,
            employer: employerData || {},
          };
        })
      );

      setJobs(jobsWithEmployer);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const fetchAppliedJobs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_applied_jobs")
      .select("job_id")
      .eq("firebase_uid", user.uid);

    const applied = {};
    data?.forEach((d) => (applied[d.job_id] = true));
    setAppliedJobs(applied);
  };

  const fetchSavedJobs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_saved_jobs")
      .select("job_id")
      .eq("firebase_uid", user.uid);

    const saved = {};
    data?.forEach((d) => (saved[d.job_id] = true));
    setSavedJobs(saved);
  };

  const toggleSaveJob = async (jobId) => {
    if (!user) return;

    if (savedJobs[jobId]) {
      // Remove from saved
      const { error } = await supabase
        .from("user_saved_jobs")
        .delete()
        .eq("firebase_uid", user.uid)
        .eq("job_id", jobId);

      if (!error) {
        setSavedJobs((prev) => {
          const updated = { ...prev };
          delete updated[jobId];
          return updated;
        });
      }
    } else {
      // Save job
      const { error } = await supabase
        .from("user_saved_jobs")
        .insert([{ firebase_uid: user.uid, job_id: jobId }]);

      if (!error) {
        setSavedJobs((prev) => ({ ...prev, [jobId]: true }));
      }
    }
  };

  const handleApply = (job) => {
    if (appliedJobs[job.id]) {
      alert("You have already applied to this job.");
      return;
    }
    setSelectedJob(job);
  };

  const submitApplication = async () => {
    if (!resumeLink.trim()) {
      alert("Please enter your resume link.");
      return;
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("name, email, phone")
      .eq("firebase_uid", user.uid)
      .single();

    if (profileError) {
      alert("Failed to fetch user profile.");
      return;
    }

    const { error: insertError } = await supabase
      .from("user_applied_jobs")
      .insert([
        {
          firebase_uid: user.uid,
          job_id: selectedJob.id,
          resume_link: resumeLink,
          user_name: userProfile?.name || "",
          user_email: userProfile?.email || "",
          user_phone: userProfile?.phone || "",
        },
      ]);

    if (!insertError) {
      const { data: jobData, error: jobError } = await supabase
        .from("employer_jobs")
        .select("firebase_uid, title")
        .eq("id", selectedJob.id)
        .single();

      if (jobError) {
        console.error(
          "Failed to fetch employer data for notification:",
          jobError
        );
      } else if (jobData) {
        await notifySpecificUser(
          jobData.firebase_uid,
          "employer", 
          "New Job Application",
          `${userProfile?.name || "A user"} applied to your job: ${
            jobData.title
          }.`
        );

        await notifyAdmin(
          "New Job Application",
          `${userProfile?.name || "A user"} applied to the job: ${
            jobData.title
          }.`
        );
      }

      alert("Application submitted successfully!");
      fetchAppliedJobs();
      setSelectedJob(null);
      setResumeLink("");
    }
  };

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          Search Jobs
        </h1>
      </div>

      <div className="flex justify-center mb-8">
        <input
          type="text"
          placeholder="Search job by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[600px] text-lg p-3 border-2 border-[#FFD24C] rounded-full shadow focus:outline-none focus:ring-2 focus:ring-[#FFD24C]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white p-4 rounded shadow-xl hover:shadow-2xl transition relative"
          >
            {job.image_url && (
              <img
                src={job.image_url}
                alt={job.title}
                className="w-full h-32 object-cover rounded mb-2"
              />
            )}
            <h2 className="text-lg font-bold text-[#333333]">{job.title}</h2>
            <p className="text-[#555555]">{job.description}</p>
            <p className="text-[#555555]">📍 {job.location}</p>
            <p className="text-[#555555]">💰 {job.salary}</p>

            {job.employer && (
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-sm text-[#333333]">
                    Company:{" "}
                    <span className="font-medium">
                      {job.employer.company_name}
                    </span>
                  </p>
                  <p className="text-sm text-[#555555]">
                    Email: {job.employer.email}
                  </p>
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => toggleSaveJob(job.id)}
                >
                  {savedJobs[job.id] ? (
                    <HeartFill className="text-[#FFD24C]" size={28} />
                  ) : (
                    <Heart className="text-[#333333]" size={28} />
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => handleApply(job)}
              disabled={appliedJobs[job.id]}
              className={`w-full mt-3 px-3 py-1 rounded ${
                appliedJobs[job.id]
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-[#FFD24C] text-[#333333] hover:bg-[#FFE9B5]"
              }`}
            >
              {appliedJobs[job.id] ? "Applied" : "Apply Now"}
            </button>
          </div>
        ))}
      </div>

      {/* Application Modal */}
      {selectedJob && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-xl max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-bold">Apply for {selectedJob.title}</h2>
            <input
              type="url"
              placeholder="Enter your resume link..."
              value={resumeLink}
              onChange={(e) => setResumeLink(e.target.value)}
              className="w-full p-2 border rounded"
            />

            <div className="space-x-3">
              <button
                onClick={submitApplication}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Submit Application
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className="bg-gray-300 text-[#333333] px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
