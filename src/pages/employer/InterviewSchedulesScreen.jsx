import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { getAuth } from "firebase/auth";
import {
  notifySpecificUser,
  notifyRole,
  notifyAllUsers,
} from "../../services/notificationService";

export default function InterviewSchedulesScreen() {
  const [interviews, setInterviews] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [editingInterview, setEditingInterview] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    const { data: employerJobs, error } = await supabase
      .from("employer_jobs")
      .select("*")
      .eq("firebase_uid", user.uid);

    if (!error && employerJobs.length) {
      setJobs(employerJobs);
      fetchAppliedJobs(employerJobs.map((job) => job.id));
    }
  };

  const fetchAppliedJobs = async (employerJobIds) => {
    const { data: applied, error } = await supabase
      .from("user_applied_jobs")
      .select("*")
      .in("job_id", employerJobIds);

    if (!error) {
      setAppliedJobs(applied);
      fetchInterviews(applied.map((a) => a.id));
    }
  };

  const fetchInterviews = async (appliedJobIds) => {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("interview_schedules")
      .select("*")
      .in("applied_job_id", appliedJobIds)
      .gte("interview_date", today);

    if (!error) {
      setInterviews(data);
    }
  };

  const getCandidateName = (appliedJobId) => {
    return appliedJobs.find((a) => a.id === appliedJobId)?.user_name || "N/A";
  };

  const getJobTitle = (appliedJobId) => {
    const jobId = appliedJobs.find((a) => a.id === appliedJobId)?.job_id;
    return jobs.find((j) => j.id === jobId)?.title || "N/A";
  };

  const handleEdit = (interview) => {
    setEditingInterview({ ...interview });
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("interview_schedules")
      .update({
        interview_date: editingInterview.interview_date,
        interview_time: editingInterview.interview_time,
        meeting_link: editingInterview.meeting_link,
      })
      .eq("id", editingInterview.id);

    if (error) {
      console.error("Failed to update interview:", error);
      alert("Failed to update interview.");
      return;
    }

    const interview = editingInterview;
    const appliedJob = appliedJobs.find(
      (a) => a.id === interview.applied_job_id
    );

    if (appliedJob) {
      await notifySpecificUser(
        appliedJob.firebase_uid,
        "user",
        "Interview Schedule Updated",
        `Your interview for "${getJobTitle(
          appliedJob.id
        )}" has been updated to ${editingInterview.interview_date} at ${
          editingInterview.interview_time
        }.`
      );
    } else {
      console.warn("No applied job found for interview update.");
    }

    alert("Interview updated successfully!");
    setEditingInterview(null);
    fetchJobs();
  };

  const handleDelete = async () => {
    const interviewToDelete = interviews.find((i) => i.id === confirmDeleteId);
    const appliedJob = appliedJobs.find(
      (a) => a.id === interviewToDelete?.applied_job_id
    );

    const { error } = await supabase
      .from("interview_schedules")
      .delete()
      .eq("id", confirmDeleteId);

    if (error) {
      console.error("Failed to delete interview:", error);
      alert("Failed to delete interview.");
      return;
    }

    if (appliedJob) {
      await notifySpecificUser(
        appliedJob.firebase_uid,
        "user",
        "Interview Cancelled",
        `Your interview for "${getJobTitle(appliedJob.id)}" has been cancelled.`
      );
    } else {
      console.warn("No applied job found for interview deletion.");
    }

    alert("Interview deleted.");
    setConfirmDeleteId(null);
    fetchJobs();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FFFAEC] min-h-screen">
      <main className="p-6 space-y-4">
        <div className="flex justify-center mt-4 mb-6">
          <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
            Interview Schedules
          </h1>
        </div>

        <div className="space-y-4">
          {interviews.length > 0 ? (
            interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white p-4 rounded shadow border space-y-2"
              >
                <p>
                  <strong>Candidate:</strong>{" "}
                  {getCandidateName(interview.applied_job_id)}
                </p>
                <p>
                  <strong>Job Title:</strong>{" "}
                  {getJobTitle(interview.applied_job_id)}
                </p>
                <p>
                  <strong>Date:</strong> {interview.interview_date}
                </p>
                <p>
                  <strong>Time:</strong> {interview.interview_time}
                </p>
                <p>
                  <strong>Meeting Link:</strong>{" "}
                  <a
                    href={interview.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 underline"
                  >
                    Join Meeting
                  </a>
                </p>

                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => handleEdit(interview)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(interview.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[#555555] italic">
              No upcoming interview schedules found. Please check back later.
            </p>
          )}
        </div>
      </main>

      {/*Edit Interview Modal*/}
      {editingInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-center">
              Edit Interview
            </h2>

            <input
              type="date"
              value={editingInterview.interview_date}
              onChange={(e) =>
                setEditingInterview({
                  ...editingInterview,
                  interview_date: e.target.value,
                })
              }
              className="w-full p-2 border rounded mb-3"
            />

            <input
              type="time"
              value={editingInterview.interview_time}
              onChange={(e) =>
                setEditingInterview({
                  ...editingInterview,
                  interview_time: e.target.value,
                })
              }
              className="w-full p-2 border rounded mb-3"
            />

            <input
              type="text"
              value={editingInterview.meeting_link}
              placeholder="Meeting link"
              onChange={(e) =>
                setEditingInterview({
                  ...editingInterview,
                  meeting_link: e.target.value,
                })
              }
              className="w-full p-2 border rounded mb-3"
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingInterview(null)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/*Delete Confirmation Dialog*/}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-4 text-red-500">
              Confirm Deletion
            </h2>
            <p>Are you sure you want to delete this interview schedule?</p>

            <div className="flex justify-center space-x-4 mt-5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
