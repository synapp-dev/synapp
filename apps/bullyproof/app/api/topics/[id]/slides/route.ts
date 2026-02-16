/**
 * Topic slides API - create and bulk delete.
 *
 * POST /api/topics/[id]/slides - Create a slide (JSON or FormData with optional file)
 * DELETE /api/topics/[id]/slides - Bulk delete slides (body: { ids: string[] })
 */
import { NextResponse } from "next/server";
import { topicsService } from "@/server/topics/topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";
import { topicsRepo } from "@/server/topics/topics.repo";
import { getTopicSlideStoragePath } from "@/server/lib/slide-storage-path";
import { topicSlidesRepo } from "@/server/topic-slides/topic-slides.repo";
import { refreshSignedUrlIfStale } from "@/server/lib/signed-url";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: topicId } = await params;
    let body: Record<string, unknown>;

    let file: File | null = null;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const dataJson = formData.get("data") as string;
      if (!dataJson) {
        return NextResponse.json(
          { error: "Missing 'data' field in FormData" },
          { status: 400 }
        );
      }
      body = JSON.parse(dataJson) as Record<string, unknown>;
      const f = formData.get("file") as File | null;
      if (f && f.size > 0) file = f;
    } else {
      body = await request.json();
    }

    const slide = await topicsService.createSlideWithPosition(
      { userId },
      topicId,
      body
    );

    if (file && slide.kind === "image") {
      const topicData = await topicsRepo.getWithDetails(topicId);
      if (!topicData?.stage) {
        return NextResponse.json(
          { error: "Topic or stage not found" },
          { status: 404 }
        );
      }
      const fileToUpload = file;
      const ext = fileToUpload.name.split(".").pop() || "jpg";
      const storagePath = getTopicSlideStoragePath(
        topicData.stage.id,
        topicId,
        slide.id,
        ext
      );
      const supabase = await createServerClient();
      const buffer = Buffer.from(await fileToUpload.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("content")
        .upload(storagePath, buffer, {
          cacheControl: "3600",
        upsert: true,
        contentType: fileToUpload.type,
        });
      if (uploadError) {
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }
      await topicsRepo.updateSlide(slide.id, { imageUrl: storagePath });
      const updated = await topicsRepo.getSlideWithTopicAndStage(slide.id);
      if (updated?.slide) {
        const signedUrl = await refreshSignedUrlIfStale(
          updated.slide,
          storagePath,
          topicSlidesRepo.updateSignedUrl
        );
        return NextResponse.json(
          { ...updated.slide, signedUrl },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(slide, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: topicId } = await params;
    const body = await request.json();
    await topicsService.deleteSlides({ userId }, topicId, body);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
