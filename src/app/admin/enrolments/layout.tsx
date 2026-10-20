import { notFound } from "next/navigation";
import { ENROLMENT_PORTAL_OPEN } from "@/lib/launch";

export default function EnrolmentsLayout({ children }: { children: React.ReactNode }) {
  if (!ENROLMENT_PORTAL_OPEN) notFound();
  return children;
}
