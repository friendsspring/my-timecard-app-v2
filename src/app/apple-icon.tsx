import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** favicon (`icon.svg`) と同じマークを iOS ホーム画面用に PNG 化 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill="hsl(238 76% 60%)" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="white" strokeWidth="1.75" />
        <path
          d="M16 11.5V16l3.25 2.25"
          fill="none"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    { ...size },
  );
}
