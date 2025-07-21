import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { getAuth } from "firebase/auth";
import { notifySpecificUser } from "../../services/notificationService";

export default function Applicants() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [applicants, setApplicants] = useState([]);
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    date: "",
    time: "",
    meetingLink: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchApplicants();
    }
  }, [user]);

  const fetchApplicants = async () => {
    const { data: jobs, error: jobsError } = await supabase
      .from("employer_jobs")
      .select("id")
      .eq("firebase_uid", user.uid);

    if (jobsError) {
      console.error("Error fetching employer jobs:", jobsError);
      return;
    }

    const jobIds = jobs.map((job) => job.id);

    const { data, error } = await supabase
      .from("user_applied_jobs")
      .select(`*, employer_jobs (title, image_url, firebase_uid)`)
      .in("job_id", jobIds);

    if (error) {
      console.error("Error fetching applicants:", error);
    } else {
      setApplicants(data);
    }

    const { data: interviews, error: interviewError } = await supabase
      .from("interview_schedules")
      .select("*");

    if (!interviewError) {
      setScheduledInterviews(interviews);
    }
  };

  const handleStatusChange = async (applicant, newStatus) => {
    const { error } = await supabase
      .from("user_applied_jobs")
      .update({ status: newStatus })
      .eq("id", applicant.id);

    if (!error) {
      await notifySpecificUser(
        applicant.firebase_uid,
        "user",
        "Application Status Updated",
        `Your application for "${applicant.employer_jobs?.title}" was ${newStatus}.`
      );

      fetchApplicants();
    } else {
      console.error("Error updating applicant status:", error);
    }
  };

  const handleSchedule = (applicant) => {
    setSelectedApplicant(applicant);
    setShowScheduleModal(true);
  };

  const isInterviewScheduled = (applicantId) => {
    return scheduledInterviews.some(
      (interview) => interview.applied_job_id === applicantId
    );
  };

  const submitSchedule = async () => {
    try {
      const { error } = await supabase.from("interview_schedules").insert([
        {
          applied_job_id: selectedApplicant.id,
          interview_date: scheduleData.date,
          interview_time: scheduleData.time,
          meeting_link: scheduleData.meetingLink,
        },
      ]);

      if (error) {
        console.error("Error inserting interview schedule:", error);
        alert("Failed to schedule interview.");
        return;
      }

      await notifySpecificUser(
        selectedApplicant.firebase_uid,
        "user",
        "Interview Scheduled",
        `Your interview for "${selectedApplicant.employer_jobs?.title}" is scheduled on ${scheduleData.date} at ${scheduleData.time}.`
      );

      alert("Interview scheduled successfully!");
      setShowScheduleModal(false);
      setScheduleData({ date: "", time: "", meetingLink: "" });
      setSelectedApplicant(null);
      fetchApplicants();
    } catch (err) {
      console.error("Unexpected error scheduling interview:", err);
      alert("An error occurred while scheduling the interview.");
    }
  };

  const filteredApplicants = applicants.filter((app) =>
    app.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          Applicants
        </h1>
      </div>

      <div className="flex justify-center mb-6">
        <input
          type="text"
          placeholder="Search applicant by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[500px] text-lg p-3 border-2 border-[#FFD24C] rounded-full shadow focus:outline-none focus:ring-2 focus:ring-[#FFD24C]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredApplicants.map((app) => (
          <div
            key={app.id}
            className="bg-white border border-gray-300 p-4 rounded shadow hover:shadow-lg transition"
          >
            <img
              src={app.employer_jobs?.image_url}
              alt="Job"
              className="w-full h-40 object-cover rounded mb-2"
            />
            <h2 className="text-lg font-semibold">{app.user_name}</h2>
            <p className="text-[#555555] text-sm">{app.user_email}</p>
            <p className="text-[#555555] text-sm">{app.user_phone}</p>
            <p className="text-sm text-[#333] mt-2">
              <strong>Applied For:</strong> {app.employer_jobs?.title}
            </p>
            <p className="text-sm text-[#333]">
              <strong>Status:</strong>{" "}
              <span
                className={`font-medium ${
                  app.status === "Approved"
                    ? "text-green-500"
                    : app.status === "Rejected"
                    ? "text-red-500"
                    : "text-blue-500"
                }`}
              >
                {app.status}
              </span>
            </p>

            <div className="space-x-2 mt-4">
              <a
                href={app.resume_link}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
              >
                View Resume
              </a>

              <button
                onClick={() =>
                  handleStatusChange(
                    app,
                    app.status === "Approved" ? "Rejected" : "Approved"
                  )
                }
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
              >
                {app.status === "Approved" ? "Reject" : "Approve"}
              </button>

              <button
                disabled={
                  app.status !== "Approved" || isInterviewScheduled(app.id)
                }
                onClick={() => handleSchedule(app)}
                className={`${
                  app.status !== "Approved" || isInterviewScheduled(app.id)
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-purple-500 hover:bg-purple-600"
                } text-white px-3 py-1 rounded text-sm`}
              >
                {isInterviewScheduled(app.id)
                  ? "Interview Schedule Picked"
                  : "Pick Interview Schedule"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl max-w-md w-full space-y-3 text-center">
            <h2 className="text-xl font-bold mb-3">Schedule Interview</h2>

            <input
              type="date"
              value={scheduleData.date}
              onChange={(e) =>
                setScheduleData({ ...scheduleData, date: e.target.value })
              }
              className="w-full p-2 border rounded"
            />

            <input
              type="time"
              value={scheduleData.time}
              onChange={(e) =>
                setScheduleData({ ...scheduleData, time: e.target.value })
              }
              className="w-full p-2 border rounded"
            />

            <input
              type="text"
              placeholder="Meeting link or ID"
              value={scheduleData.meetingLink}
              onChange={(e) =>
                setScheduleData({
                  ...scheduleData,
                  meetingLink: e.target.value,
                })
              }
              className="w-full p-2 border rounded"
            />

            <div className="space-x-3 mt-4">
              <button
                onClick={submitSchedule}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Submit
              </button>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
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
