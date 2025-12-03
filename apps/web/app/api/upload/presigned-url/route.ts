import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Define file configuration type
interface FileConfig {
  allowedTypes: string[];
  maxSize: number;
  folder: string;
}

// File type configurations
const FILE_CONFIGS: Record<"image" | "resume", FileConfig> = {
  image: {
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: "images",
  },
  resume: {
    allowedTypes: ["application/pdf"],
    maxSize: 2 * 1024 * 1024, // 2MB
    folder: "resumes",
  },
};

type FileType = keyof typeof FILE_CONFIGS;

// Sanitize filename
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
  
    if (!session?.user?.id) {
      console.error("Auth failed - session:", session);
      return NextResponse.json(
        { error: "Unauthorized - Please log in to upload files" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { filename, contentType, fileType, category } = body;

    // Validate required fields
    if (!filename || !contentType || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields: filename, contentType, fileType" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!FILE_CONFIGS[fileType as FileType]) {
      return NextResponse.json(
        { error: "Invalid file type. Must be 'image' or 'resume'" },
        { status: 400 }
      );
    }

    const config = FILE_CONFIGS[fileType as FileType];

    // ✅ Validate content type (fixed typing)
    if (!config.allowedTypes.includes(String(contentType))) {
      return NextResponse.json(
        {
          error: `Invalid content type for ${fileType}. Allowed: ${config.allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Sanitize and create unique filename
    const sanitized = sanitizeFilename(filename);
    const extension = sanitized.split(".").pop();
    const uniqueFilename = `${uuidv4()}.${extension}`;

    // Determine S3 folder structure
    let key: string;
    if (fileType === "resume") {
      // Resumes go under: resumes/{userId}/{uuid}.{ext}
      key = `resumes/${session.user.id}/${uniqueFilename}`;
    } else if (category === "jobs") {
      // Job logos go under: company_logos/{uuid}.{ext}
      key = `company_logos/${uniqueFilename}`;
    } else if (category === "services") {
      // Service images go under: services/images/{uuid}.{ext}
      key = `services/images/${uniqueFilename}`;
    } else if (category) {
      // Fallback: {category}/{folder}/{uuid}.{ext}
      key = `${category}/${config.folder}/${uniqueFilename}`;
    } else {
      // Generic fallback: {folder}/{uuid}.{ext}
      key = `${config.folder}/${uniqueFilename}`;
    }

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    // Construct the final public URL
    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      key,
      maxSize: config.maxSize,
    });
  } catch (error) {
    console.error("Presigned URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}