import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import UserSidebar from "../../components/user/UserSidebar";
import UserHeader from "../../components/user/UserHeader";
import { getAuth } from "firebase/auth";

export default function InterviewSchedules() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user]);

  const fetchSchedules = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: appliedJobs } = await supabase
        .from("user_applied_jobs")
        .select("id")
        .eq("firebase_uid", user.uid);

      const appliedJobIds = appliedJobs.map((job) => job.id);

      const { data, error } = await supabase
        .from("interview_schedules")
        .select("*")
        .in("applied_job_id", appliedJobIds)
        .gte("interview_date", today);

      if (error) throw error;

      const enriched = await Promise.all(
        data.map(async (schedule) => {
          const { data: appliedJob } = await supabase
            .from("user_applied_jobs")
            .select("job_id, user_name")
            .eq("id", schedule.applied_job_id)
            .single();

          const { data: job } = await supabase
            .from("employer_jobs")
            .select("title, image_url, firebase_uid")
            .eq("id", appliedJob?.job_id)
            .single();

          let companyName = "Unknown Company";

          if (job?.firebase_uid) {
            const { data: employer } = await supabase
              .from("employer_profiles")
              .select("company_name")
              .eq("firebase_uid", job.firebase_uid)
              .single();

            companyName = employer?.company_name || "Unknown Company";
          }

          return {
            ...schedule,
            jobTitle: job?.title || "Unknown Job",
            jobImage: job?.image_url,
            candidateName: appliedJob?.user_name || "N/A",
            companyName,
          };
        })
      );

      setSchedules(enriched);
    } catch (err) {
      console.error("Error fetching interview schedules:", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FFFAEC]">
      <div className="sticky top-0 h-screen">
        <UserSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <UserHeader />

        <main className="p-6 space-y-4">
          <div className="flex justify-center mt-4 mb-6">
            <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
              My Interview Schedules
            </h1>
          </div>

          {schedules.length === 0 ? (
            <p className="text-center text-[#555555]">
              No interview schedules yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-white p-4 rounded shadow space-y-2 border"
                >
                  {schedule.jobImage && (
                    <img
                      src={schedule.jobImage}
                      alt={schedule.jobTitle}
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <h2 className="text-lg font-bold">{schedule.jobTitle}</h2>
                  <p className="text-[#555555]">
                    Company: {schedule.companyName}
                  </p>
                  <p className="text-[#555555]">
                    Candidate: {schedule.candidateName}
                  </p>
                  <p className="text-[#555555]">
                    📅 Date: {schedule.interview_date}
                  </p>
                  <p className="text-[#555555]">
                    ⏰ Time: {schedule.interview_time}
                  </p>
                  <p className="text-[#555555]">
                    🔗{" "}
                    <a
                      href={schedule.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 underline"
                    >
                      Join Now
                    </a>
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
