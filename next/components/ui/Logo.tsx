import Link from "next/link";

interface LogoProps {
  className?: string;
  iconClassName?: string; /* unused but kept for compatibility */
  textClassName?: string;
}

export function Logo({ className = "", textClassName = "" }: LogoProps) {
  return (
    <Link href="/" className={`flex flex-col ${className}`}>
      <span className={`font-black text-[24px] text-[#0057cd] tracking-tight ${textClassName}`}>VinaPharmacy</span>
      <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Hệ thống quản lý chuỗi</span>
    </Link>
  );
}
