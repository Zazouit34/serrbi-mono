"use client";

import "react-csv-importer/dist/index.css";
import { Importer, ImporterField } from "react-csv-importer";
import { useState } from "react";
import { trpc } from "@/app/_trpc/client";

export default function ServicesCreation() {
  const utils = trpc.useUtils();
  const [rows, setRows] = useState<any[]>([]);
  const bulk = trpc.service.bulkCreate.useMutation({
    onSuccess: () => {
      setRows([]);
      utils.service.getService.invalidate();
      alert("Import complete");
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Services Import</h1>
      <Importer dataHandler={async (batch: any[]) => setRows((p) => [...p, ...batch])} restartable>
        <ImporterField name="title" label="Title" />
        <ImporterField name="description" label="Description" />
        <ImporterField name="serviceCategory" label="Category" />
        <ImporterField name="type" label="Type" />
        <ImporterField name="price" label="Price" optional />
        <ImporterField name="priceType" label="Price Type" optional />
        <ImporterField name="stateAbbreviation" label="State (e.g. USA)" optional />
        <ImporterField name="city" label="City" optional />
        <ImporterField name="address" label="Address" optional />
        <ImporterField name="phoneNumber" label="Phone" optional />
        <ImporterField name="email" label="Email" optional />
        <ImporterField name="website" label="Website" optional />
        <ImporterField name="displayName" label="Display Name" optional />
        <ImporterField name="displayImage" label="Display Image URL" optional />
      </Importer>

      <button
        className="px-4 py-2 text-white bg-black rounded disabled:opacity-50"
        disabled={!rows.length || bulk.isPending}
        onClick={() => bulk.mutate({ rows })}
      >
        {bulk.isPending ? "Importing..." : `Import ${rows.length} services`}
      </button>
    </div>
  );
}