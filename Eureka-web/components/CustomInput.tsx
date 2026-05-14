"use client";

import type { CustomInputProps } from "@/type";
import cn from "clsx";
import { useState } from "react";

const CustomInput = ({
  placeholder = "Enter text",
  value,
  onChange,
  label,
  type = "text",
}: CustomInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      <label className="label">{label}</label>
      <input
        type={type}
        autoCapitalize="none"
        autoCorrect="off"
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          "input",
          isFocused ? "border-primary" : "border-gray-300"
        )}
      />
    </div>
  );
};

export default CustomInput;
