import { ReactNode } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { useAuth } from "@/lib/auth";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="bg-neutral-50 text-neutral-800 h-screen overflow-hidden flex">
      <Sidebar />
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
