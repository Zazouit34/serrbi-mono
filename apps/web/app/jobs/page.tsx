import Link from "next/link";
import { JobListing } from "./job-listing/job-listing";
export const dynamic = "force-static";

export default function JobsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center py-16 space-y-18">
        <h1 className="text-5xl text-foreground font-outfit">
          Open jobs
        </h1>
        <div className="flex gap-4">
          <Link 
            href="/jobs/job-listing/new"
             className="inline-block px-6 py-3 text-center text-black bg-gradient-to-b from-gray-100 to-white rounded-xl shadow-xl transition-colors via-white/90"
          >
            Post a Job
          </Link>
          <Link 
            href="#" 
            className="inline-block px-6 py-3 text-center text-black bg-gradient-to-b from-white to-gray-100 rounded-xl shadow-xl transition-colors"
          >
            Post Resume
          </Link>
        </div>
      </div>
      <div className="grid gap-6">
        <JobListing />
      </div>
    </div>
  );
}
