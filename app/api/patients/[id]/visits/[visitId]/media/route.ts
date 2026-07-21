import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const ALLOWED_FILE_TYPES = ["PHOTO", "XRAY", "SCAN", "PDF", "STL", "VIDEO", "OTHER"];

const mapMediaType = (fileType: string, fileName: string) => {
  if (fileType === "PHOTO") return "PHOTO";
  if (fileType === "XRAY") return "XRAY";
  if (fileType === "PDF") return "PDF";
  if (fileType === "STL") return "STL";
  if (fileType === "VIDEO") return "VIDEO";
  if (fileType === "SCAN" && fileName.toLowerCase().endsWith(".stl")) {
    return "STL";
  }
  return "OTHER";
};

const toLegacyShape = (media: any) => {
  const metadata = media.metadata && typeof media.metadata === "object" ? media.metadata : {};
  const storagePath = String(media.url || "").replace(/^\//, "");
  return {
    id: media.id,
    visitId: media.visitId,
    filename: media.fileName || path.basename(storagePath),
    originalName: String((metadata as any).originalName || media.fileName || path.basename(storagePath)),
    storagePath,
    mimeType: media.mimeType || "application/octet-stream",
    fileSize: media.fileSize || 0,
    fileType: String((metadata as any).fileType || media.type || "OTHER"),
    category: String((metadata as any).category || "Other"),
    uploadedBy: String((metadata as any).uploadedBy || "Unknown"),
    uploadedAt: media.createdAt instanceof Date ? media.createdAt.toISOString() : String(media.createdAt),
  };
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; visitId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, visitId } = await params;
  const patientId = Number(id);
  const visitIdNumber = Number(visitId);

  if (!Number.isFinite(patientId) || !Number.isFinite(visitIdNumber)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const visit = await prisma.visit.findFirst({
    where: { id: visitIdNumber, patient: { userId: user.id, id: patientId } },
    include: { medias: true },
  });

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  return NextResponse.json(visit.medias.map(toLegacyShape));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; visitId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, visitId } = await params;
  const patientId = Number(id);
  const visitIdNumber = Number(visitId);

  if (!Number.isFinite(patientId) || !Number.isFinite(visitIdNumber)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const visit = await prisma.visit.findFirst({
    where: { id: visitIdNumber, patient: { userId: user.id, id: patientId } },
  });

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files");
  const fileType = String(formData.get("fileType") || "OTHER").toUpperCase();
  const category = String(formData.get("category") || "Other");
  const uploadedBy = String(formData.get("uploadedBy") || user.name || user.email || user.id);

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one file upload is required." }, { status: 400 });
  }

  const fileTypeValue = ALLOWED_FILE_TYPES.includes(fileType) ? fileType : "OTHER";
  const relativeDir = path.join("uploads", "patients", String(patientId), "visits", String(visitIdNumber));
  const storageDirectory = path.join(process.cwd(), "public", relativeDir);
  fs.mkdirSync(storageDirectory, { recursive: true });

  const createdMedia = [];

  for (const rawFile of files) {
    if (!(rawFile instanceof File)) continue;
    const buffer = Buffer.from(await rawFile.arrayBuffer());
    const safeName = `${Date.now()}-${rawFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = path.join(relativeDir, safeName).replace(/\\/g, "/");
    const absolutePath = path.join(process.cwd(), "public", storagePath);
    fs.writeFileSync(absolutePath, buffer);

    const media = await prisma.media.create({
      data: {
        visitId: visitIdNumber,
        type: mapMediaType(fileTypeValue, rawFile.name) as any,
        url: storagePath,
        fileName: safeName,
        mimeType: rawFile.type,
        fileSize: buffer.length,
        metadata: {
          fileType: fileTypeValue,
          category,
          uploadedBy,
          originalName: rawFile.name,
        },
      },
    });

    createdMedia.push(toLegacyShape(media));
  }

  return NextResponse.json(createdMedia, { status: 201 });
}
