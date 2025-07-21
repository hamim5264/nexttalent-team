import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import EmployerSidebar from "../../components/employer/EmployerSidebar";
import EmployerHeader from "../../components/employer/EmployerHeader";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getAuth } from "firebase/auth";

export default function EmployerDashboard() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [counts, setCounts] = useState({
    totalJobs: 0,
    applicants: 0,
    interviews: 0,
  });
  const [postedJobs, setPostedJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [trendingJobs, setTrendingJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [newsFeed, setNewsFeed] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    await Promise.all([
      fetchCounts(),
      fetchPostedJobs(),
      fetchAllJobs(),
      fetchTrendingJobs(),
      fetchInterviews(),
      fetchNewsFeed(),
      fetchReviews(),
    ]);
    setLoading(false);
  };

  const fetchCounts = async () => {
    const { count: jobsCount } = await supabase
      .from("employer_jobs")
      .select("*", { count: "exact", head: true })
      .eq("firebase_uid", user.uid);

    const { count: applicantsCount } = await supabase
      .from("user_applied_jobs")
      .select("*", { count: "exact", head: true })
      .in("job_id", await getEmployerJobIds());

    const { count: interviewsCount } = await supabase
      .from("interview_schedules")
      .select("*", { count: "exact", head: true })
      .in("applied_job_id", await getEmployerAppliedJobIds());

    setCounts({
      totalJobs: jobsCount || 0,
      applicants: applicantsCount || 0,
      interviews: interviewsCount || 0,
    });
  };

  const getEmployerJobIds = async () => {
    const { data } = await supabase
      .from("employer_jobs")
      .select("id")
      .eq("firebase_uid", user.uid);
    return data?.map((job) => job.id) || [];
  };

  const getEmployerAppliedJobIds = async () => {
    const jobIds = await getEmployerJobIds();
    const { data } = await supabase
      .from("user_applied_jobs")
      .select("id, job_id")
      .in("job_id", jobIds);
    return data?.map((app) => app.id) || [];
  };

  const fetchPostedJobs = async () => {
    const { data } = await supabase
      .from("employer_jobs")
      .select("*")
      .eq("firebase_uid", user.uid);
    setPostedJobs(data || []);
  };

  const fetchAllJobs = async () => {
    const { data } = await supabase.from("employer_jobs").select("*");
    setAllJobs(data || []);
  };

  const fetchTrendingJobs = async () => {
    const { data: appliedJobs } = await supabase
      .from("user_applied_jobs")
      .select("job_id");

    const jobFrequency = appliedJobs.reduce((acc, curr) => {
      acc[curr.job_id] = (acc[curr.job_id] || 0) + 1;
      return acc;
    }, {});

    const trendingJobIds = Object.keys(jobFrequency).filter(
      (id) => jobFrequency[id] >= 2
    );

    const { data: jobs } = await supabase
      .from("employer_jobs")
      .select("*")
      .in("id", trendingJobIds);
    setTrendingJobs(jobs || []);
  };

  const fetchInterviews = async () => {
    const appliedJobIds = await getEmployerAppliedJobIds();
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("interview_schedules")
      .select("*")
      .in("applied_job_id", appliedJobIds)
      .gte("interview_date", today);

    setInterviews(data || []);
  };

  const fetchNewsFeed = async () => {
    const { data } = await supabase.from("news_feed").select("*");
    setNewsFeed(data || []);
  };

  const fetchReviews = async () => {
    const { data } = await supabase.from("user_reviews").select("*");
    setReviews(data || []);
  };

  const chartData = [
    { name: "Jobs", value: counts.totalJobs, color: "#FFD24C" },
    { name: "Applicants", value: counts.applicants, color: "#71C9CE" },
    { name: "Interviews", value: counts.interviews, color: "#FF6F61" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-yellow-300 via-white to-yellow-200 bg-opacity-60 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-r from-[#FFFAEC] to-[#FFD24C]">
      <EmployerSidebar />
      <div className="flex flex-col flex-1 min-h-screen">
        <EmployerHeader />
        <main className="p-6 flex-1 overflow-auto">
          <h1 className="text-2xl font-bold text-center mb-6 text-[#333333] rounded-full border-2 border-neon px-4 py-2 w-fit mx-auto">
            Let's Grow Your Hiring Journey 🚀
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Jobs Posted" value={counts.totalJobs} />
            <StatCard title="Applicants" value={counts.applicants} />
            <StatCard title="Interviews Scheduled" value={counts.interviews} />
          </div>

          <section className="bg-white p-4 rounded shadow mb-6 border-2 border-neon">
            <h2 className="text-xl font-semibold text-center mb-4">
              Platform Statistics
            </h2>
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
          </section>

          <SectionCard title="Your Posted Jobs">
            {postedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </SectionCard>

          <SectionCard title="All Jobs">
            {allJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </SectionCard>

          <SectionCard title="Trending Jobs">
            {trendingJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </SectionCard>

          <SectionCard title="Interview Schedules">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white p-3 rounded border shadow border-neon"
              >
                <p>Date: {interview.interview_date}</p>
                <p>Time: {interview.interview_time}</p>
                <p>
                  Link:{" "}
                  <a
                    href={interview.meeting_link}
                    className="text-blue-500 underline"
                  >
                    Join
                  </a>
                </p>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="NextTalent News">
            {newsFeed.map((news) => (
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
            ))}
          </SectionCard>

          <SectionCard title="Reviews">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white p-3 rounded border shadow border-neon"
              >
                <p>{review.review_text}</p>
                <p>Rating: {review.rating} ⭐</p>
              </div>
            ))}
          </SectionCard>

          <footer className="text-center text-sm text-[#555555] mt-10">
            © 2025 NextTalent || Powered By DevEngine - All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow text-center border-2 border-neon hover:scale-105 transition-transform">
      <h3 className="text-lg font-medium text-[#333333]">{title}</h3>
      <p className="text-3xl font-bold mt-2 text-[#FFD24C]">{value}</p>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-[#333333]">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function JobCard({ job }) {
  return (
    <div className="bg-white p-4 rounded shadow border-2 border-neon">
      <img
        src={job.image_url}
        alt={job.title}
        className="h-32 w-full object-cover rounded mb-2"
      />
      <h3 className="font-bold">{job.title}</h3>
      <p className="text-sm">{job.description}</p>
      <p className="text-xs mt-1">Location: {job.location}</p>
      <p className="text-xs">Salary: {job.salary}</p>
      <p className="text-xs font-semibold text-black">
        Status:{" "}
        <span
          className={`${
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
    </div>
  );
}
