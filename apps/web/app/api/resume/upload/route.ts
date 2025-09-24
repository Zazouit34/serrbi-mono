import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!; // server only

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey);
  const safeName = encodeURIComponent(file.name);
  const path = `${session.user.id}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from("resumes").upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data } = supabase.storage.from("resumes").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
