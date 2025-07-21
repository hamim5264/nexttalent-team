import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { getAuth } from "firebase/auth";

export default function ManageJobs() {
  const [jobs, setJobs] = useState([]);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    const { data: jobsData, error } = await supabase
      .from("employer_jobs")
      .select("*")
      .eq("firebase_uid", user.uid);

    if (error) {
      console.error("Error fetching jobs:", error);
      return;
    }

    const jobsWithApplicants = await Promise.all(
      jobsData.map(async (job) => {
        const { count } = await supabase
          .from("user_applied_jobs")
          .select("*", { count: "exact", head: true })
          .eq("job_id", job.id);

        return { ...job, applicantsCount: count };
      })
    );

    setJobs(jobsWithApplicants);
  };

  const toggleJobStatus = async (jobId, currentStatus) => {
    const newStatus = currentStatus === "Open" ? "Closed" : "Open";

    const { error } = await supabase
      .from("employer_jobs")
      .update({ job_status: newStatus })
      .eq("id", jobId);

    if (!error) {
      alert(`Job has been ${newStatus.toLowerCase()} successfully!`);
      fetchJobs();
    } else {
      console.error("Error updating job status:", error);
    }
  };

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          Manage Your Jobs
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white p-4 rounded shadow border hover:shadow-lg transition-all space-y-2"
          >
            {job.image_url && (
              <img
                src={job.image_url}
                alt={job.title}
                className="w-full h-32 object-cover rounded"
              />
            )}
            <h2 className="text-lg font-bold text-[#333333]">{job.title}</h2>
            <p className="text-[#555555]">{job.description}</p>
            <p className="text-sm text-[#555555]">
              Applicants: {job.applicantsCount}
            </p>
            <p className="text-sm text-[#555555]">
              Job Status:{" "}
              <span className="font-medium">{job.job_status || "Open"}</span>
            </p>

            <button
              onClick={() => toggleJobStatus(job.id, job.job_status)}
              className={`w-full px-3 py-1 rounded text-sm ${
                job.job_status === "Closed"
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              {job.job_status === "Closed" ? "Re-Open Job" : "Close Job"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
