"use client";

import { useState, useEffect } from "react";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  defaultValue: number;
  className?: string;
  disabled?: boolean;
}

/**
 * 숫자 입력 컴포넌트
 * - 입력 중 범위 강제 없음 (자유 타이핑)
 * - onBlur 시 min/max 범위 검증 및 기본값 적용
 * - onFocus 시 전체 선택
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  defaultValue,
  className = "",
  disabled = false,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState<string>(String(value));

  // 외부 value 변경 시 로컬 상태 동기화
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // 빈 문자열 허용 (삭제 중)
    if (inputValue === "") {
      setLocalValue("");
      return;
    }

    const numValue = parseInt(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setLocalValue(inputValue);
      onChange(numValue);
    }
  };

  const handleBlur = () => {
    const numValue = parseInt(localValue);
    const finalValue = isNaN(numValue) || localValue === ""
      ? defaultValue
      : Math.min(max, Math.max(min, numValue));

    setLocalValue(String(finalValue));
    onChange(finalValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      min={min}
      max={max}
      disabled={disabled}
      className={className}
    />
  );
}
