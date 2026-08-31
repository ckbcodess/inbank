"use client";

import Image from "next/image";

export function MobilePromoBanner() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 shadow-xs min-h-[260px] bg-gradient-to-br from-[#fdc307] via-[#f5bc19] to-[#f0b100] text-black">
      {/* Background ambient glow effect */}
      <div className="pointer-events-none absolute -left-20 -top-20 size-[320px] rounded-full bg-white/20 blur-2xl" />

      {/* Content Area */}
      <div className="relative z-10 flex flex-col justify-between h-full max-w-[60%] sm:max-w-[55%]">
        <div>
          <h3 className="text-[22px] font-bold leading-tight tracking-tight text-neutral-950 sm:text-[26px]">
            Banking made easier, wherever you are.
          </h3>
          <p className="mt-2 text-[12px] font-medium text-neutral-800/80 sm:text-[13px]">
            Scan to download the mobile app on iOS & Android.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="mt-6 flex items-center gap-3">
          <div className="size-[84px] overflow-hidden rounded-xl border border-black/10 bg-white/90 p-1.5 shadow-sm">
            <Image
              src="/images/dashboard/qr-code-1.png"
              alt="QR Code to download NIBS Mobile App"
              width={80}
              height={80}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col text-[11px] font-medium text-neutral-900 leading-tight">
            <span>Point camera</span>
            <span>to install</span>
          </div>
        </div>
      </div>

      {/* 3D Phone / App Illustration */}
      <div className="pointer-events-none absolute -bottom-8 -right-4 h-[270px] w-[210px] sm:h-[300px] sm:w-[240px]">
        <Image
          src="/images/dashboard/phone-app-mockup.png"
          alt="NIBS Mobile App Preview"
          width={240}
          height={300}
          className="h-full w-full object-contain drop-shadow-xl"
        />
      </div>
    </div>
  );
}
