import ResumeScoreCardSimple from "@/components/ui/resume-score-card-simple";
import LoadingProcess from "@/components/ui/loading-process";

export default function ResumeAnalyzerTestPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] py-10 px-4">
      <div className="grid gap-8 items-start mx-auto max-w-6xl lg:grid-cols-2">
        <div className="flex justify-center">
          <ResumeScoreCardSimple />
        </div>
        <div className="flex justify-center">
          <LoadingProcess currentStep={1} />
        </div>
      </div>
    </div>
  );
}

