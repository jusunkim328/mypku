"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Button } from "@/components/ui";

interface ImageUploaderProps {
  imageBase64: string | null;
  onImageSelect: (base64: string) => void;
}

export default function ImageUploader({
  imageBase64,
  onImageSelect,
}: ImageUploaderProps) {
  const t = useTranslations("AnalyzePage");
  const tImg = useTranslations("ImageUploader");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // 이미지 리사이징 (최대 1024px)
      const resizedBase64 = await resizeImage(file, 1024);
      onImageSelect(resizedBase64);
    } catch (error) {
      console.error("이미지 처리 오류:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resizeImage = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

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
          ctx?.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <Card className="p-4">
      {imageBase64 ? (
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
            <img
              src={imageBase64}
              alt={tImg("selectedImage")}
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            small
            outline
            onClick={() => onImageSelect("")}
            className="w-full"
          >
            {t("selectAnother")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50">
            <svg
              className="w-12 h-12 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-gray-500 text-sm">{t("selectPhoto")}</p>
          </div>

          <div className="flex gap-2">
            <Button
              large
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1"
            >
              {t("camera")}
            </Button>
            <Button
              large
              outline
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1"
            >
              {t("gallery")}
            </Button>
          </div>

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
    </Card>
  );
}
