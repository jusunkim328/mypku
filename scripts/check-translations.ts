/**
 * 번역 키 일관성 검증 스크립트
 *
 * 사용법: bun scripts/check-translations.ts
 *
 * en.json을 기준으로 ko.json, ru.json의 키 누락/초과를 검출합니다.
 */

import fs from "fs";
import path from "path";

const MESSAGES_DIR = path.join(import.meta.dir, "..", "messages");
const BASE_LOCALE = "en";

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// 메시지 파일 로드
const files = fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"));
const locales: Record<string, Record<string, unknown>> = {};

for (const file of files) {
  const locale = file.replace(".json", "");
  const content = fs.readFileSync(path.join(MESSAGES_DIR, file), "utf-8");
  locales[locale] = JSON.parse(content);
}

const baseKeys = new Set(getKeys(locales[BASE_LOCALE]));
const otherLocales = Object.keys(locales).filter((l) => l !== BASE_LOCALE);

let hasIssues = false;

for (const locale of otherLocales) {
  const localeKeys = new Set(getKeys(locales[locale]));

  const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !baseKeys.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✓ ${locale}.json — 모든 키 일치 (${baseKeys.size}개)`);
  } else {
    hasIssues = true;
    console.log(`✗ ${locale}.json — 문제 발견:`);
    if (missing.length > 0) {
      console.log(`  누락된 키 (${missing.length}개):`);
      for (const key of missing) {
        console.log(`    - ${key}`);
      }
    }
    if (extra.length > 0) {
      console.log(`  초과된 키 (${extra.length}개):`);
      for (const key of extra) {
        console.log(`    + ${key}`);
      }
    }
  }
}

process.exit(hasIssues ? 1 : 0);
