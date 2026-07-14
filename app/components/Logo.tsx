"use client";

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-lg shadow-md"
        aria-hidden
      >
        <defs>
          <linearGradient id="lg" x1="0" x2="1">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="60%" stopColor="#0EA5A4" />
            <stop offset="100%" stopColor="#0F4A4F" />
          </linearGradient>
        </defs>

        <rect width="56" height="56" rx="10" fill="url(#lg)" />
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
          fontWeight="700"
          fontSize="18"
          fill="#fff"
        >
          OA
        </text>
      </svg>

      <div className="leading-none text-white">
        <div className="text-lg font-semibold tracking-tight">
          <span className="italic font-extrabold">ortho</span>
          <span className="font-extrabold">assistant</span>
        </div>
        <div className="text-[10px] text-white/80 tracking-widest">powered by <span className="font-medium">orthoprime</span></div>
      </div>
    </div>
  );
}
