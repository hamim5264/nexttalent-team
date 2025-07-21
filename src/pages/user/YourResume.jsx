import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import supabase from "../../supabaseClient";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

export default function YourResume() {
  const auth = getAuth();
  const user = auth.currentUser;
  const [resume, setResume] = useState(null);
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    if (user) {
      fetchResume();
    }
  }, [user]);

  const fetchResume = async () => {
    const { data, error } = await supabase
      .from("user_resumes")
      .select("resume_data")
      .eq("firebase_uid", user.uid)
      .single();

    if (data?.resume_data) {
      setResume(data.resume_data);
      setShareLink(`${window.location.origin}/resume/${user.uid}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert("Resume link copied to clipboard!");
  };

  if (!resume) {
    return (
      <div className="p-6 bg-[#FFFAEC] min-h-screen flex justify-center items-center">
        <p className="text-[#555555] text-lg">
          No resume found. Please build your resume first.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#FFFAEC] min-h-screen max-w-3xl mx-auto">
      <div className="flex justify-center mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#333333] border-2 border-[#FFD24C] rounded-full px-5 py-1 shadow-[0_0_10px_#FFD24C]">
          Your Professional Resume
        </h1>
      </div>

      <div className="bg-white p-6 rounded shadow-xl space-y-4">
        <div className="text-center">
          {resume.profileImageUrl && (
            <img
              src={resume.profileImageUrl}
              alt="Profile"
              className="w-24 h-24 mx-auto rounded-full mb-2 object-cover border-2 border-[#FFD24C]"
            />
          )}
          <h2 className="text-2xl font-bold">{resume.fullName}</h2>
          <p>
            {resume.email} | {resume.phone}
          </p>
          {resume.portfolioLink && (
            <a
              href={resume.portfolioLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Portfolio
            </a>
          )}
        </div>

        <Section title="Summary" content={resume.summary} />
        <Section title="Skills" content={resume.skills} />
        <Section title="Experience" content={resume.experience} />
        <Section title="Education" content={resume.education} />
        <Section title="Projects" content={resume.projects} />

        <div className="flex space-x-4 mt-4 justify-center">
          <button
            onClick={handleCopyLink}
            className="bg-[#FFD24C] text-[#333333] px-4 py-2 rounded hover:bg-[#FFE9B5]"
          >
            Copy Shareable Link
          </button>

          <PDFDownloadLink
            document={<ResumePDF resume={resume} />}
            fileName="resume.pdf"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {({ loading }) => (loading ? "Preparing PDF..." : "Export as PDF")}
          </PDFDownloadLink>
        </div>
      </div>
    </div>
  );
}

function Section({ title, content }) {
  if (!content) return null;
  return (
    <div>
      <h3 className="text-xl font-semibold text-[#333333] mb-1">{title}</h3>
      <p className="text-[#555555] whitespace-pre-wrap">{content}</p>
    </div>
  );
}

// PDF STYLES
const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 12,
  },
  section: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  heading: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: "bold",
  },
  text: {
    marginBottom: 8,
  },
});

// PDF Template
function ResumePDF({ resume }) {
  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.title}>{resume.fullName}</Text>
        <Text style={styles.text}>
          {resume.email} | {resume.phone}
        </Text>
        {resume.portfolioLink && (
          <Text style={styles.text}>Portfolio: {resume.portfolioLink}</Text>
        )}

        <PDFSection heading="Summary" content={resume.summary} />
        <PDFSection heading="Skills" content={resume.skills} />
        <PDFSection heading="Experience" content={resume.experience} />
        <PDFSection heading="Education" content={resume.education} />
        <PDFSection heading="Projects" content={resume.projects} />
      </Page>
    </Document>
  );
}

function PDFSection({ heading, content }) {
  if (!content) return null;
  return (
    <Text style={styles.section}>
      <Text style={styles.heading}>
        {heading}:{"\n"}
      </Text>
      <Text>{content}</Text>
    </Text>
  );
}
