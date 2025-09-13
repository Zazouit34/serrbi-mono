import Link from "next/link";
import { JobListing } from "./job-listing/job-listing";
export const dynamic = "force-static";

export default function JobsPage() {
  return (
    <div>
      <div className="flex flex-col items-center space-y-6">
        <h1 className="text-4xl text-foreground font-outfit">
          Open Jobs
        </h1>
        <div className="flex gap-4">
          <Link 
            href="/jobs/job-listing/new"
            className="px-6 py-3 text-white bg-[#FF040E] rounded-lg hover:bg-[#FF040E]/90 transition-colors inline-block text-center"
          >
            Post a Job
          </Link>
          <Link 
            href="#" 
            className="inline-block px-6 py-3 text-center text-white bg-black rounded-lg transition-colors hover:bg-gray-800"
          >
            Post Your CV
          </Link>
        </div>
      </div>
      <div className="grid gap-6 mt-6">
        <JobListing />
      </div>
    </div>
  );
}
