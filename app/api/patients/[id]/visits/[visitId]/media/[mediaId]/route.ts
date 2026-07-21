import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; visitId: string; mediaId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, visitId, mediaId } = await params;
  const patientId = Number(id);
  const visitIdNumber = Number(visitId);
  const mediaIdNumber = Number(mediaId);

  if (!Number.isFinite(patientId) || !Number.isFinite(visitIdNumber) || !Number.isFinite(mediaIdNumber)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const visit = await prisma.visit.findFirst({
    where: { id: visitIdNumber, patient: { id: patientId, userId: user.id } },
  });

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  const media = await prisma.media.findFirst({
    where: { id: mediaIdNumber, visitId: visitIdNumber },
  });

  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const storagePath = path.join(
    process.cwd(),
    "public",
    String(media.url || "").replace(/^\//, "")
  );
  try {
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
    }
  } catch {
    // continue even if file deletion fails
  }

  await prisma.media.delete({ where: { id: mediaIdNumber } });

  return NextResponse.json({ success: true });
}
