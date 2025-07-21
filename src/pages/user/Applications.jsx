import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { getAuth } from "firebase/auth";

export default function Applications() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("user_applied_jobs")
        .select("*")
        .eq("firebase_uid", user.uid);

      if (error) throw error;

      const enrichedApps = await Promise.all(
        data.map(async (app) => {
          const { data: job } = await supabase
            .from("employer_jobs")
            .select("title, firebase_uid, image_url")
            .eq("id", app.job_id)
            .single();

          const { data: employer } = await supabase
            .from("employer_profiles")
            .select("company_name")
            .eq("firebase_uid", job?.firebase_uid)
            .single();

          return {
            id: app.id,
            jobTitle: job?.title || "N/A",
            companyName: employer?.company_name || "Unknown Company",
            status: app.status,
            image: job?.image_url,
          };
        })
      );

      setApplications(enrichedApps);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  const filteredApplications = applications.filter((app) =>
    app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          My Applicationss
        </h1>
      </div>

      <div className="flex justify-center mb-8">
        <input
          type="text"
          placeholder="Search your applications by job title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[600px] text-lg p-3 border-2 border-[#FFD24C] rounded-full shadow focus:outline-none focus:ring-2 focus:ring-[#FFD24C]"
        />
      </div>

      {filteredApplications.length === 0 ? (
        <p className="text-[#555555] text-center">
          You haven't applied to any jobs yet or no match found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map((app) => (
            <div
              key={app.id}
              className="bg-white p-4 rounded shadow border space-y-2"
            >
              {app.image && (
                <img
                  src={app.image}
                  alt={app.jobTitle}
                  className="w-full h-32 object-cover rounded"
                />
              )}
              <h2 className="text-lg font-semibold text-[#333333]">
                {app.jobTitle}
              </h2>
              <p className="text-[#555555]">{app.companyName}</p>
              <p className="text-[#555555]">
                Status:{" "}
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

              <span className="text-xl">
                {app.status === "Pending"}
                {app.status === "Approved"}
                {app.status === "Rejected"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
