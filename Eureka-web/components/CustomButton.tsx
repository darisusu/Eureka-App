"use client";

import type { CustomButtonProps } from "@/type";
import cn from "clsx";

const CustomButton = ({
  onClick,
  title = "Click Me",
  className,
  leftIcon,
  isLoading = false,
  disabled = false,
  type = "button",
}: CustomButtonProps) => {
  return (
    <button
      type={type}
      className={cn("custom-btn", className, (isLoading || disabled) && "opacity-50 cursor-not-allowed")}
      onClick={onClick}
      disabled={isLoading || disabled}
    >
      <span className="flex items-center justify-center gap-2">
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {leftIcon}
            <span className="text-white paragraph-semibold">{title}</span>
          </>
        )}
      </span>
    </button>
  );
};

export default CustomButton;
