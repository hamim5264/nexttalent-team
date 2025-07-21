import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../supabaseClient";
import UserSidebar from "../../components/user/UserSidebar";
import UserHeader from "../../components/user/UserHeader";
import { getAuth } from "firebase/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function UserDashboard() {
  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [appliedJobsCount, setAppliedJobsCount] = useState(0);
  const [approvedJobsCount, setApprovedJobsCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allJobs, setAllJobs] = useState([]);
  const [trendingJobs, setTrendingJobs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [newsFeed, setNewsFeed] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (user) {
      initializeData();
    }
  }, [user]);

  const initializeData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCounts(),
      fetchAllJobs(),
      fetchTrendingJobs(),
      fetchSchedules(),
      fetchCompanies(),
      fetchNewsFeed(),
      fetchReviews(),
    ]);
    setLoading(false);
  };

  const fetchCounts = async () => {
    if (!user) return;

    const { count: appliedCount } = await supabase
      .from("user_applied_jobs")
      .select("*", { count: "exact", head: true })
      .eq("firebase_uid", user.uid);

    const { count: approvedCount } = await supabase
      .from("user_applied_jobs")
      .select("*", { count: "exact", head: true })
      .eq("firebase_uid", user.uid)
      .eq("status", "Approved");

    const { data: appliedJobs } = await supabase
      .from("user_applied_jobs")
      .select("id")
      .eq("firebase_uid", user.uid);

    const appliedJobIds = appliedJobs?.map((job) => job.id) || [];

    let interviewCount = 0;
    if (appliedJobIds.length > 0) {
      const { count } = await supabase
        .from("interview_schedules")
        .select("*", { count: "exact", head: true })
        .in("applied_job_id", appliedJobIds);
      interviewCount = count || 0;
    }

    setAppliedJobsCount(appliedCount || 0);
    setApprovedJobsCount(approvedCount || 0);
    setInterviewCount(interviewCount);
  };

  const fetchAllJobs = async () => {
    const { data } = await supabase
      .from("employer_jobs")
      .select("*")
      .eq("status", "Approved");
    setAllJobs(data || []);
  };

  const fetchTrendingJobs = async () => {
    const { data } = await supabase.from("user_applied_jobs").select("job_id");
    const jobCountMap = {};
    data.forEach(({ job_id }) => {
      jobCountMap[job_id] = (jobCountMap[job_id] || 0) + 1;
    });
    const trendingIds = Object.keys(jobCountMap).filter(
      (id) => jobCountMap[id] >= 2
    );

    if (trendingIds.length) {
      const { data: trendingData } = await supabase
        .from("employer_jobs")
        .select("*")
        .in("id", trendingIds);
      setTrendingJobs(trendingData || []);
    }
  };

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from("user_applied_jobs")
      .select("id")
      .eq("firebase_uid", user.uid);

    const appliedJobIds = data.map((job) => job.id);

    if (appliedJobIds.length) {
      const today = new Date().toISOString().split("T")[0];
      const { data: scheduleData } = await supabase
        .from("interview_schedules")
        .select("*")
        .in("applied_job_id", appliedJobIds)
        .gte("interview_date", today);

      setSchedules(scheduleData || []);
    }
  };

  const fetchNewsFeed = async () => {
    const { data, error } = await supabase.from("news_feed").select("*");
    if (!error) {
      setNewsFeed(data || []);
    } else {
      console.error("Error fetching news feed:", error);
    }
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from("employer_profiles").select("*");
    setCompanies(data || []);
  };

  const fetchReviews = async () => {
    const { data } = await supabase.from("user_reviews").select("*");
    setReviews(data || []);
  };

  const chartData = [
    { name: "Applied", value: appliedJobsCount, color: "#FFD24C" },
    { name: "Approved", value: approvedJobsCount, color: "#71C9CE" },
    { name: "Interviews", value: interviewCount, color: "#FF6F61" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-yellow-300 via-white to-yellow-200 bg-opacity-60 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FFFAEC]">
      <div className="sticky top-0 h-screen">
        <UserSidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto">
        <UserHeader />

        <main className="p-6 flex-1 space-y-10">
          <h1 className="text-4xl font-bold text-center text-[#333333]">
            🚀 Get the Right Job You Deserve
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CounterCard title="Applied Jobs" value={appliedJobsCount} />
            <CounterCard title="Approved Jobs" value={approvedJobsCount} />
            <CounterCard title="Interviews Scheduled" value={interviewCount} />
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <Section title="All Jobs">
            {allJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </Section>

          <Section title="Trending Jobs">
            {trendingJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </Section>

          <Section title="Interview Schedules">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="bg-white p-4 rounded shadow border-2 border-neon"
              >
                <p>Date: {s.interview_date}</p>
                <p>Time: {s.interview_time}</p>
                <a
                  href={s.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  Join Now
                </a>
              </div>
            ))}
          </Section>
          <Section title="NextTalent News">
            {newsFeed.length > 0 ? (
              newsFeed.map((news) => (
                <div
                  key={news.id}
                  className="bg-white p-3 rounded border shadow border-neon"
                >
                  <img
                    src={news.image_url}
                    alt={news.title}
                    className="h-32 w-full object-cover mb-2 rounded"
                  />
                  <h4 className="font-bold">{news.title}</h4>
                  <p className="text-sm">{news.description}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-center">
                No news available right now.
              </p>
            )}
          </Section>

          <Section title="Top Companies">
            {companies.map((c) => (
              <div
                key={c.id}
                className="bg-white p-4 rounded shadow text-center border-2 border-neon"
              >
                <img
                  src={c.logo_url || "https://via.placeholder.com/100"}
                  alt={c.company_name}
                  className="w-16 h-16 mx-auto mb-2 rounded-full"
                />
                <h4 className="font-bold">{c.company_name}</h4>
                <p>{c.website || "N/A"}</p>
              </div>
            ))}
          </Section>

          <Section title="Platform Reviews">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-white p-4 rounded shadow border-2 border-neon"
              >
                <p className="italic text-[#555555]">{r.review_text}</p>
                <p className="text-sm mt-1">Rating: {r.rating} ⭐</p>
              </div>
            ))}
          </Section>

          <footer className="text-center text-sm text-[#555555] mt-10">
            © 2025 NextTalent || Powered By DevEngine - All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}

function CounterCard({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow text-center border-2 border-neon hover:scale-105 transition">
      <h3 className="text-lg text-[#333333]">{title}</h3>
      <p className="text-3xl font-bold text-[#FFD24C]">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-[#333333]">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </section>
  );
}

function JobCard({ job, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded shadow border-2 border-neon cursor-pointer hover:scale-105 transition"
    >
      {job.image_url && (
        <img
          src={job.image_url}
          alt={job.title}
          className="w-full h-32 object-cover rounded mb-2"
        />
      )}
      <h3 className="font-bold">{job.title}</h3>
      <p className="text-sm text-[#555555]">{job.description}</p>
      <p className="text-xs text-[#777] mt-1">
        Location: {job.location || "N/A"}
      </p>
      <p className="text-xs text-[#777]">Salary: {job.salary || "N/A"}</p>
    </div>
  );
}
