import  ResumeListingForm  from "@/components/ui/form/job/resume-listing-form";

export const dynamic = 'force-dynamic';

export default function NewResumeListingPage() {
  return (
    <div className="flex justify-center items-center">
      <ResumeListingForm />
    </div>
  );
}
