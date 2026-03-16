"use client";

import "react-csv-importer/dist/index.css";
import { Importer, ImporterField } from "react-csv-importer";
import { useState } from "react";
import { trpc } from "@/app/_trpc/client";

export default function ServicesImportPage() {
  const utils = trpc.useUtils();
  const [rows, setRows] = useState<any[]>([]);
  const bulk = trpc.service.bulkCreate.useMutation({
    onSuccess: () => {
      setRows([]);
      utils.service.getService.invalidate();
      alert("Import complete");
    },
    // #region agent log
    onError: (err: any) => {
      const fullErr = { message: err.message, data: err.data, shape: err.shape, raw: JSON.stringify(err).slice(0, 2000) };
      console.error("[DEBUG-H1H3] bulkCreate error:", fullErr);
      fetch('http://127.0.0.1:7242/ingest/38701efe-25f9-4c22-a6d3-10a91fbf46a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'service-creation/page.tsx:onError',message:'bulkCreate mutation error',data:fullErr,timestamp:Date.now(),hypothesisId:'H1_H3'})}).catch(()=>{});
    },
    // #endregion
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Services Import</h1>
      <Importer dataHandler={async (batch: any[]) => setRows((p) => [...p, ...batch])} restartable>
        <ImporterField name="title" label="Title" />
        <ImporterField name="description" label="Description" />
        <ImporterField name="serviceCategory" label="Category" />
        <ImporterField name="averageRating" label="Average Rating" optional />
        <ImporterField name="numberOfReviews" label="Number of Reviews" optional />
        <ImporterField name="type" label="Type" />
        <ImporterField name="price" label="Price" optional />
        <ImporterField name="stateAbbreviation" label="State (e.g. USA)" optional />
        <ImporterField name="city" label="City" optional />
        <ImporterField name="address" label="Address" optional />
        <ImporterField name="phoneNumber" label="Phone" optional />
        <ImporterField name="email" label="Email" optional />
        <ImporterField name="website" label="Website" optional />
        <ImporterField name="displayName" label="Display Name" optional />
        <ImporterField name="displayImage" label="Display Image URL" optional />
        <ImporterField name="images" label="Images" optional />
      </Importer>

      <button
        className="px-4 py-2 text-white bg-black rounded disabled:opacity-50"
        disabled={!rows.length || bulk.isPending}
        onClick={() => {
          // #region agent log
          const sample = rows.slice(0, 2).map((r: any) => ({ serviceCategory: r.serviceCategory, serviceCategoryCharCodes: typeof r.serviceCategory === 'string' ? [...r.serviceCategory].map(c => c.charCodeAt(0)) : null, type: r.type, title: r.title }));
          console.log("[DEBUG-H3H5] rows sample:", sample, "total:", rows.length);
          fetch('http://127.0.0.1:7242/ingest/38701efe-25f9-4c22-a6d3-10a91fbf46a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'service-creation/page.tsx:onClick',message:'rows before mutation',data:{sample,totalRows:rows.length},timestamp:Date.now(),hypothesisId:'H3_H5'})}).catch(()=>{});
          // #endregion
          bulk.mutate({ rows });
        }}
      >
        {bulk.isPending ? "Importing..." : `Import ${rows.length} services`}
      </button>
    </div>
  );
}