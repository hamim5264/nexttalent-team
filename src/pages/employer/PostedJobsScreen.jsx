import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import supabase from "../../supabaseClient";

export default function PostedJobsScreen() {
  const [postedJobs, setPostedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchPostedJobs();
    }
  }, [user]);

  const fetchPostedJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("employer_jobs")
        .select("*")
        .eq("firebase_uid", user.uid);

      if (error) {
        console.error("Error fetching jobs:", error);
      } else {
        setPostedJobs(data);
      }
    } catch (err) {
      console.error("Unexpected error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingJob((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateJob = async () => {
    const { error } = await supabase
      .from("employer_jobs")
      .update({
        title: editingJob.title,
        location: editingJob.location,
        salary: editingJob.salary,
        image_url: editingJob.image_url,
        description: editingJob.description,
      })
      .eq("id", editingJob.id);

    if (error) {
      console.error("Error updating job:", error);
      alert("Failed to update job.");
    } else {
      alert("Job updated successfully!");
      fetchPostedJobs();
      setEditingJob(null);
    }
  };

  const confirmDelete = (jobId) => {
    setJobToDelete(jobId);
  };

  const handleDeleteConfirmed = async () => {
    const { error } = await supabase
      .from("employer_jobs")
      .delete()
      .eq("id", jobToDelete);

    if (!error) {
      alert("Job deleted successfully.");
      fetchPostedJobs();
    } else {
      console.error("Error deleting job:", error);
      alert("Failed to delete job.");
    }

    setJobToDelete(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FFFAEC] min-h-screen">
      <main className="p-6 space-y-4">
        <div className="flex justify-center mt-4 mb-6">
          <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
            Your Posted Jobs
          </h1>
        </div>

        {loading ? (
          <p>Loading your posted jobs...</p>
        ) : postedJobs.length === 0 ? (
          <p className="text-center text-[#555555]">
            No jobs posted yet. Start posting some!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {postedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-4 rounded shadow hover:scale-105 transition-all space-y-2"
              >
                <img
                  src={job.image_url}
                  alt={job.title}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                <h2 className="text-lg font-bold">{job.title}</h2>
                <p className="text-[#555555]">{job.description}</p>
                <p className="text-sm mt-1">
                  <span className="font-medium text-black">Status:</span>{" "}
                  <span
                    className={`font-medium ${
                      job.status === "Approved"
                        ? "text-green-500"
                        : job.status === "Rejected"
                        ? "text-red-500"
                        : "text-blue-500"
                    }`}
                  >
                    {job.status}
                  </span>
                </p>

                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => handleEdit(job)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(job.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingJob && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow max-w-md w-full space-y-3">
              <h2 className="text-xl font-bold mb-2">Edit Job</h2>
              <input
                name="title"
                value={editingJob.title}
                onChange={handleEditChange}
                className="w-full p-2 border rounded"
                placeholder="Job Title"
              />
              <input
                name="location"
                value={editingJob.location}
                onChange={handleEditChange}
                className="w-full p-2 border rounded"
                placeholder="Location"
              />
              <input
                name="salary"
                value={editingJob.salary}
                onChange={handleEditChange}
                className="w-full p-2 border rounded"
                placeholder="Salary"
              />
              <input
                name="image_url"
                value={editingJob.image_url}
                onChange={handleEditChange}
                className="w-full p-2 border rounded"
                placeholder="Image URL"
              />
              <textarea
                name="description"
                value={editingJob.description}
                onChange={handleEditChange}
                className="w-full p-2 border rounded"
                placeholder="Description"
                rows="3"
              />

              <div className="flex justify-between mt-3">
                <button
                  onClick={handleUpdateJob}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Update
                </button>
                <button
                  onClick={() => setEditingJob(null)}
                  className="bg-gray-300 text-[#333] px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {jobToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-lg text-center max-w-sm w-full">
              <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
              <p className="text-[#555555] mb-4">
                Are you sure you want to delete this job?
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleDeleteConfirmed}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setJobToDelete(null)}
                  className="bg-gray-300 text-[#333] px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
