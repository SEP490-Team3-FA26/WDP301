import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { 
  ArrowRight, ShieldCheck, Activity, PackageSearch, 
  Workflow, CheckCircle2, ChevronDown, Fingerprint, 
  Box, Search, History, BrainCircuit, ScanBarcode, ArrowRightLeft,
  Settings
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Hero Text Split Reveal (Staggering lines up from hidden overflow wrapper)
      gsap.fromTo(".hero-text",
        { y: "110%", opacity: 0, rotate: 2 },
        { y: "0%", opacity: 1, rotate: 0, duration: 1.2, stagger: 0.15, ease: "power4.out", delay: 0.1 }
      );

      // Hero Sub-elements Fade-in
      gsap.fromTo(".hero-fade",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: "power3.out", delay: 0.8 }
      );

      // 2. Number Counter Animation on Load
      if (counterRef.current) {
        const counterObj = { val: 0 };
        gsap.to(counterObj, {
          val: 1200000,
          duration: 3,
          delay: 1.2,
          ease: "power2.out",
          onUpdate: function () {
            if (counterRef.current) {
               // Format with commas, e.g., 1,200,000
              counterRef.current.innerText = Math.floor(counterObj.val).toLocaleString('en-US');
            }
          }
        });
      }

      // 3. Core Pain Points Bento Grid Reveal
      gsap.fromTo(".bento-card",
        { y: 80, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: "power3.out",
          scrollTrigger: {
            trigger: "#pain-points",
            start: "top 80%",
          }
        }
      );

      // 4. Ecosystem Modules Scale & Reveal
      gsap.fromTo(".module-card",
        { y: 60, opacity: 0, scale: 0.95 },
        {
          y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.15, ease: "back.out(1.4)",
          scrollTrigger: {
            trigger: "#modules",
            start: "top 75%",
          }
        }
      );

      // 5. Light Parallax for Decorative items
      gsap.utils.toArray<HTMLElement>('.parallax-layer').forEach(layer => {
        const speed = layer.getAttribute('data-speed') || "1";
        gsap.to(layer, {
          y: () => -(window.innerHeight * parseFloat(speed) * 0.1),
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true
          }
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <div className="bg-[#ffffff] text-[#1e293b] font-sans selection:bg-[#0d6efd] selection:text-white" ref={containerRef}>
      
      {/* 1. STICKY HEADER */}
      <nav className="fixed w-full z-50 top-0 backdrop-blur-xl bg-white/80 border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex flex-col">
              <span className="font-black text-2xl text-[#0d6efd] tracking-tight">SmartPharma AI</span>
            </Link>
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Chuẩn Bộ Y Tế / MoH Compliant</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="#features" className="hidden sm:block font-bold text-sm text-slate-500 hover:text-[#0d6efd] transition-colors">
              Giải pháp
            </a>
            <span className="hidden sm:block w-px h-5 bg-slate-200"></span>
            <Link 
              to="/login"
              className="bg-[#0d6efd] hover:bg-[#0a58ca] text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg shadow-[#0d6efd]/20 transform hover:-translate-y-0.5"
            >
              System Login →
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-44 pb-24 px-6 overflow-hidden min-h-[95vh] flex flex-col justify-center">
        {/* Medical Abstract Background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
           <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-[#0d6efd]/5 to-transparent"></div>
           <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-[#0d6efd]/10 rounded-full blur-[120px] parallax-layer" data-speed="2"></div>
           <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] bg-sky-200/20 rounded-full blur-[100px] parallax-layer" data-speed="-1.5"></div>
        </div>

        <div className="max-w-5xl mx-auto w-full relative z-10">
          
          <div className="mb-6 overflow-hidden inline-block hero-fade">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold tracking-widest uppercase">
              <Activity size={14} className="text-[#0d6efd]" />
              Enterprise Pharmacy ERP version 3.0
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-[#1e293b] leading-[1.1] tracking-tight mb-8">
            <div className="overflow-hidden pb-1">
              <div className="hero-text transform origin-bottom-left">Quản Lý Chuỗi Nhà Thuốc</div>
            </div>
            <div className="overflow-hidden pb-1">
              <div className="hero-text transform origin-bottom-left">Đa Chi Nhánh Khép Kín</div>
            </div>
            <div className="overflow-hidden pb-1">
              <div className="hero-text transform origin-bottom-left text-[#0d6efd]">Kho Thông Minh QR & AI</div>
            </div>
            <div className="overflow-hidden mt-4">
              <div className="hero-text text-xl md:text-2xl font-bold text-slate-400 font-sans tracking-normal opacity-80">
                Closed-Loop Multi-Branch Pharmacy Management Powered by Smart QR & AI.
              </div>
            </div>
          </h1>

          <p className="hero-fade text-lg md:text-xl text-slate-500 max-w-3xl mb-12 font-medium leading-relaxed">
            Hệ thống quản lý từ 2 - 20 chi nhánh linh hoạt. Năng lực xử lý dữ liệu khổng lồ với 50,000+ SKUs, tối ưu luân chuyển hàng hóa theo chuẩn FIFO (First In, First Out).
          </p>

          <div className="hero-fade flex flex-col sm:flex-row items-center gap-6 mb-16">
            <Link 
              to="/login"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0d6efd] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#0a58ca] transition-all shadow-xl shadow-[#0d6efd]/20 active:scale-95"
            >
              Đăng Ký Demo Hệ Thống Miễn Phí
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Schedule Free Demo Session →
            </div>
          </div>

          {/* Social Proof Counter */}
          <div className="hero-fade flex items-center gap-6 p-6 bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 max-w-fit shadow-2xl shadow-blue-900/5">
             <div className="flex -space-x-3">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=PharmaA" className="w-10 h-10 rounded-full border-2 border-white bg-slate-100" alt="Avatar"/>
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=PharmaB" className="w-10 h-10 rounded-full border-2 border-white bg-slate-100" alt="Avatar"/>
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=PharmaC" className="w-10 h-10 rounded-full border-2 border-white bg-slate-100" alt="Avatar"/>
             </div>
             <div>
               <div className="flex items-baseline gap-1">
                 <span className="text-2xl font-black text-[#1e293b]">+</span>
                 <span ref={counterRef} className="text-2xl font-black text-[#1e293b]">0</span>
               </div>
               <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">lô thuốc được tracking thành công</p>
             </div>
          </div>
        </div>
      </section>

      {/* 3. CORE PAIN POINTS BENTO GRID */}
      <section id="pain-points" className="py-24 px-6 bg-slate-50 relative border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 bento-card">
            <h2 className="text-3xl md:text-5xl font-black text-[#1e293b] mb-4 tracking-tight">Giải quyết triệt để<br/>3 nỗi đau ngành Dược</h2>
            <p className="text-lg text-slate-500 font-medium">Overcoming Critical Bottlenecks in Pharmacy Supply Chains</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(300px,_auto)]">
            
            {/* Card A: Unit Conversion */}
            <div className="bento-card md:col-span-7 bg-white rounded-3xl p-8 border border-slate-200 relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                     <Workflow size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-[#1e293b] mb-2">Đồng bộ Quy đổi Đơn vị Triệt để</h3>
                  <p className="text-slate-500 font-medium mb-8">Unit Conversion Chaos Resolved. Phá bỏ rào cản tính toán sai sót từ Thùng → Hộp → Vỉ → Viên.</p>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3 font-mono text-sm shadow-inner group-hover:bg-[#0d6efd]/5 transition-colors">
                     <div className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
                       <span className="font-bold text-slate-700 flex items-center gap-2"><Box size={16}/> 1 Thùng (Bulk)</span>
                       <ArrowRightLeft size={14} className="text-slate-400" />
                       <span className="font-bold text-[#0d6efd]">100 Hộp</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
                       <span className="font-bold text-slate-700 flex items-center gap-2"><PackageSearch size={16}/> 1 Hộp (Box)</span>
                       <ArrowRightLeft size={14} className="text-slate-400" />
                       <span className="font-bold text-[#0d6efd]">5 Vỉ</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
                       <span className="font-bold text-slate-700 flex items-center gap-2"><Activity size={16}/> 1 Vỉ (Blister)</span>
                       <ArrowRightLeft size={14} className="text-slate-400" />
                       <span className="font-bold text-[#0d6efd]">10 Viên</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Card B: AI Near-Expiry Alerts */}
            <div className="bento-card md:col-span-5 bg-[#1e293b] text-white rounded-3xl p-8 border border-slate-800 relative overflow-hidden group shadow-2xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-red-500/20 transition-colors"></div>
               <div className="relative z-10 h-full flex flex-col">
                  <div className="w-12 h-12 bg-white/10 text-red-400 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                     <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Cảnh báo Cận Date AI</h3>
                  <p className="text-slate-400 font-medium mb-auto">AI Near-Expiry Realtime Alerts. Tự động đánh dấu và cách ly hàng quá hạn.</p>
                  
                  <div className="mt-8 space-y-4">
                     <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Cảnh báo Đỏ</p>
                          <p className="font-bold">Panadol Extra (Lô X902)</p>
                        </div>
                        <div className="bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-lg animate-pulse flex items-center gap-1">
                          {'< 30 Ngày'}
                        </div>
                     </div>
                     <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Cảnh báo Vàng</p>
                          <p className="font-bold">Augmentin (Lô B110)</p>
                        </div>
                        <div className="bg-amber-500 text-white text-xs font-black px-3 py-1.5 rounded-lg">
                          {'30 - 60 Ngày'}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Card C: Lot Traceability & Audit Logs */}
            <div className="bento-card md:col-span-12 bg-white rounded-3xl p-8 border border-slate-200 flex flex-col md:flex-row gap-8 items-center group">
               <div className="flex-1">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                     <History size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-[#1e293b] mb-2">Truy xuất Lô & Audit Log Toàn chuỗi</h3>
                  <p className="text-slate-500 font-medium">Lot Traceability & Strict Data Integrity Logs. Chống thất thoát qua lịch sử chuyển kho liên tuyến chéo rõ ràng tới từng timestamp.</p>
               </div>
               <div className="flex-1 w-full bg-slate-900 rounded-2xl p-5 border border-slate-800 font-mono text-xs overflow-hidden shadow-inner group-hover:shadow-[0_0_30px_rgba(13,110,253,0.15)] transition-shadow">
                  <div className="space-y-3">
                     {[
                       { time: "08:14:22", user: "Khoa_WHS", action: "TRANSFERRED [Lô A09-Paracetamol]", to: "Branch_DistrictA", status: "SUCCESS" },
                       { time: "09:05:41", user: "Admin_System", action: "APPROVED REBATE_POLICY", to: "All_Branches", status: "LOCKED_HASH" },
                       { time: "10:22:15", user: "Mai_BranchA", action: "RECEIVED [Lô A09-Paracetamol]", to: "Local_Inventory", status: "VERIFIED_QR" },
                     ].map((log, i) => (
                       <div key={i} className="flex gap-4 items-start border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                         <span className="text-slate-500">[{log.time}]</span>
                         <span className="text-emerald-400">{log.user}</span>
                         <span className="text-slate-300 flex-1 truncate">{log.action}</span>
                         <span className="text-[#0d6efd] font-bold hidden sm:block">{log.status}</span>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. ECOSYSTEM MODULES GRID */}
      <section id="modules" className="py-24 px-6 bg-white shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#1e293b] mb-2">7 Hệ sinh thái Module Cốt lõi</h2>
            <p className="text-slate-500 font-medium">Comprehensive System Architecture / Kiến trúc hệ thống toàn diện</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {[
              { id: "M01", title: "POS Counter App", icon: <CheckCircle2 size={32}/>, desc: "Bán hàng đa kho, quét mã vạch kê đơn (OTC & RX) nhanh chóng." },
              { id: "M02", title: "Smart Inbound", icon: <ScanBarcode size={32}/>, desc: "Mobile-first scanner layout. Nhập xuất kho siêu tốc qua QR code." },
              { id: "M03", title: "Chain Analytics", icon: <Search size={32}/>, desc: "Dashboard báo cáo dòng tiền, doanh thu chi nhánh thời gian thực." },
              { id: "M04", title: "AI Forecast", icon: <BrainCircuit size={32}/>, desc: "AI dự báo hành vi mua thuốc theo mùa, tối ưu chi phí tồn kho (Procurement Engine)." },
            ].map((mod, i) => (
              <div key={i} className="module-card group bg-slate-50 hover:bg-[#0d6efd]/5 p-8 rounded-3xl border border-slate-100 hover:border-[#0d6efd]/30 transition-all duration-300 cursor-default hover:-translate-y-2">
                 <div className="text-[#0d6efd] mb-8 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all origin-left">
                   {mod.icon}
                 </div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{mod.id} CORE LAYER</div>
                 <h3 className="text-xl font-bold text-[#1e293b] mb-3">{mod.title}</h3>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">{mod.desc}</p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* 5. ACCORDION FAQ SECTION */}
      <section className="py-24 px-6 bg-[#f8fafc] border-y border-slate-200/60">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-[#1e293b] mb-12 text-center">Câu Hỏi Thường Gặp (B2B Inquiries)</h2>
          
          <div className="space-y-4">
            {[
              {
                q: "Hệ thống có hỗ trợ quét mã vạch và QR code khi mất mạng không?",
                subtitle: "(Offline Scanning Support)",
                a: "Có. Module POS được thiết kế với cơ chế Offline-First Local Cache. Dược sĩ vẫn có thể quét, tạo đơn và bán hàng bình thường. Dữ liệu sẽ tự động đồng bộ (sync) lên server trung tâm an toàn ngay khi kết nối mạng được khôi phục, đảm bảo không gián đoạn dịch vụ khách hàng."
              },
              {
                q: "Thuật toán AI dự báo nhập hàng cần bao nhiêu dữ liệu lịch sử để học?",
                subtitle: "(AI Procurement Engine Requirements)",
                a: "Thuật toán AI cần tối thiểu 3 tháng dữ liệu bán hàng lịch sử để bắt đầu học và đưa ra dự báo xu hướng (Baseline Forecast). Tuy nhiên, mức độ chính xác tối ưu (>92%) sẽ đạt được sau 6 tháng đến 1 năm do module có thể tích lũy và nắm bắt dữ liệu biến động bệnh lý theo độ trễ mùa vụ."
              },
              {
                q: "Quy trình thiết lập hệ thống ở mỗi chi nhánh mới mất bao lâu?",
                subtitle: "(Branch Onboarding Setup Time)",
                a: "Kiến trúc đám mây (Cloud-based REST APIs) cho phép triển khai Master Data (DM thuốc, giá bán, cấu hình) xuống chi nhánh mới chỉ mất dưới 5 phút. Bạn chỉ cần cấp quyền Admin Chi Nhánh, hệ thống sẽ tự động đồng bộ tồn kho số dư đầu kỳ được đẩy từ Tổng Kho qua App."
              }
            ].map((faq, i) => (
              <div 
                key={i} 
                className={`border border-slate-200 bg-white rounded-2xl overflow-hidden transition-all duration-300 ${openFAQ === i ? 'shadow-md border-slate-300' : 'hover:border-slate-300'}`}
              >
                <button 
                  onClick={() => toggleFAQ(i)}
                  className="w-full text-left px-6 py-5 flex items-start justify-between bg-white text-[#1e293b] focus:outline-none"
                >
                  <div className="pr-4">
                    <h4 className="font-bold text-lg mb-1">{faq.q}</h4>
                    <p className="text-xs font-bold text-[#0d6efd] uppercase tracking-wide">{faq.subtitle}</p>
                  </div>
                  <ChevronDown size={20} className={`text-slate-400 shrink-0 mt-1 transition-transform duration-300 ${openFAQ === i ? 'rotate-180' : ''}`} />
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFAQ === i ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-slate-600 font-medium leading-relaxed pt-2 border-t border-slate-100">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL HERO CTA & COMPLIANT FOOTER */}
      <section className="relative pt-32 pb-0 bg-[#0f172a] text-white overflow-hidden">
        {/* Soft abstract blue gradient mesh background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-90"></div>
          <div className="absolute -top-[50%] -left-[10%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d6efd]/20 via-transparent to-transparent opacity-60"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center mb-32">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Số Hóa Chuỗi Nhà Thuốc<br/>Của Bạn Ngay Hôm Nay.</h2>
          <p className="text-xl text-slate-400 font-medium mb-12">Digitalize Your Pharmacy Chain Today. Secure, Compliant, and AI-Powered.</p>
          <Link 
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#0f172a] px-10 py-5 rounded-full font-black text-lg hover:bg-slate-100 transition-transform hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
          >
            Trải nghiệm Không gian Làm việc →
          </Link>
        </div>

        {/* Multi-column Footer */}
        <footer className="relative z-10 border-t border-slate-800 bg-[#0b0f19] pt-16 pb-8 px-6 text-sm">
           <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
              <div className="md:col-span-5">
                 <span className="font-black text-2xl text-white tracking-tight mb-4 inline-block">SmartPharma<span className="text-[#0d6efd]">AI</span></span>
                 <p className="text-slate-400 leading-relaxed font-medium mb-6 max-w-sm">
                   Hệ sinh thái nền tảng Quản trị ERP cấp doanh nghiệp dành riêng cho Chuỗi cửa hàng bán lẻ Dược phẩm tại Việt Nam.
                 </p>
                 <div className="inline-block border border-slate-800 bg-slate-900/50 p-3 rounded-lg text-xs text-slate-400 font-mono">
                    System Architecture: Next.js 14 / Tailwind / PostgreSQL / GSAP
                 </div>
              </div>
              
              <div className="md:col-span-2 md:col-start-8">
                 <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Về Dự Án (Project Info)</h4>
                 <ul className="space-y-3 text-slate-400 font-medium font-mono text-xs">
                    <li>Group 3</li>
                    <li>Đồ Án Tốt Nghiệp</li>
                    <li>FPT University 2026</li>
                    <li>Software Engineering</li>
                 </ul>
              </div>

              <div className="md:col-span-3">
                 <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Tuân Thủ Tiêu Chuẩn</h4>
                 <ul className="space-y-3 text-slate-400 font-medium text-xs leading-relaxed">
                    <li className="flex items-start gap-2">
                       <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                       <span>Ministry of Health (MoH) Circulars compliant. (Thông tư chuẩn Đơn thuốc điện tử)</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                       <span>GPP Standard Protocol Verified Architecture.</span>
                    </li>
                 </ul>
              </div>
           </div>
           
           <div className="max-w-7xl mx-auto border-t border-slate-800/80 pt-8 flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs font-bold">
              <p>© 2026 SmartPharma AI by Group 3. All rights reserved.</p>
              <div className="flex gap-4 mt-4 md:mt-0">
                 <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                 <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
           </div>
        </footer>
      </section>

    </div>
  );
}
