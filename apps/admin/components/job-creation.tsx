"use client";

import "react-csv-importer/dist/index.css";
import { Importer, ImporterField } from "react-csv-importer";
import { useState } from "react";
import { trpc } from "@/app/_trpc/client";

export default function JobsCreation() {
  const utils = trpc.useUtils();
  const [rows, setRows] = useState<any[]>([]);
  const bulk = trpc.job.bulkCreate.useMutation({
    onSuccess: () => {
      setRows([]);
      utils.job.getJob.invalidate();
      alert("Import complete");
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Jobs Import</h1>
      <Importer
        dataHandler={async (batch: any[]) => setRows((prev) => [...prev, ...batch])}
        restartable
      >
        <ImporterField name="title" label="Title" />
        <ImporterField name="companyName" label="Company Name" />
        <ImporterField name="companyImage" label="Company Image" optional />
        <ImporterField name="description" label="Description" />
        <ImporterField name="category" label="Category" />
        <ImporterField name="type" label="Type" />
        <ImporterField name="locationRequirement" label="Location Requirement" />
        <ImporterField name="experienceLevel" label="Experience Level" />
        <ImporterField name="tags" label="Tags (e.g. CNC, GMAO, électromécanique)" optional />
        <ImporterField name="wage" label="Wage" optional />
        <ImporterField name="stateAbbreviation" label="State (e.g. CA)" optional />
        <ImporterField name="countryIso2" label="Country ISO2" optional />
        <ImporterField name="city" label="City" optional />
        <ImporterField name="applicationEmail" label="Application Email" optional />
        <ImporterField name="applicationUrl" label="Application URL" optional />
      </Importer>

      <button
        className="px-4 py-2 text-white bg-black rounded disabled:opacity-50"
        disabled={!rows.length || bulk.isPending}
        onClick={() => bulk.mutate({ rows })}
      >
        {bulk.isPending ? "Importing..." : `Import ${rows.length} jobs`}
      </button>
    </div>
  );
}