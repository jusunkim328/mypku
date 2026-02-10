"use client";

import { createClient } from "./client";

const BUCKET_NAME = "meal-images";

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Base64 이미지를 Supabase Storage에 업로드
 */
export async function uploadMealImage(
  base64: string,
  userId: string
): Promise<UploadResult> {
  const supabase = createClient();

  // Base64 데이터 파싱
  const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error("유효하지 않은 이미지 형식입니다.");
  }

  const extension = matches[1];
  const base64Data = matches[2];

  // Base64를 Blob으로 변환
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: `image/${extension}` });

  // 파일 경로 생성 (user_id/timestamp.extension)
  const timestamp = Date.now();
  const path = `${userId}/${timestamp}.${extension}`;

  // 업로드
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, blob, {
      contentType: `image/${extension}`,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("이미지 업로드 실패:", uploadError);
    throw new Error("이미지 업로드에 실패했습니다.");
  }

  // 공개 URL 생성
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
  };
}

/**
 * Supabase Storage에서 이미지 삭제
 */
export async function deleteMealImage(path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error("이미지 삭제 실패:", error);
    throw new Error("이미지 삭제에 실패했습니다.");
  }
}

/**
 * File 객체를 Base64로 변환
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 리사이징 (최대 1024px)
 */
export async function resizeImage(
  base64: string,
  maxSize = 1024
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // 비율 유지하면서 리사이징
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context 생성 실패"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = base64;
  });
}
