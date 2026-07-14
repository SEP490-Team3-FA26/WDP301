"use client";
import { CustomerLayout } from "@/layouts/CustomerLayout";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
