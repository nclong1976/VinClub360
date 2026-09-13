import React, { useState } from "react";
import { TrendingUp, Dices } from "lucide-react";
import { motion } from "framer-motion";
import StocksTab from "@/components/admin/StocksTab";
import CasinoTab from "@/components/admin/CasinoTab";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";
import AnimatedTabPanel from "@/components/admin/AnimatedTabPanel";

const SUB_TABS = [
  { id: "stocks", label: "Đầu tư chứng khoán", icon: TrendingUp },
  { id: "casino", label: "Quản lý Casino", icon: Dices },
];

export default function StocksCasinoTab({ onNavigateToProjects, initialSubTab = "stocks" }) {
  const [subTab, setSubTab] = useState(initialSubTab);

  return (
    <div className="space-y-3.5">
      {/* ── Sub-Navigation Switcher (Chứng khoán / Casino) ── */}
      <div className="bg-white rounded-2xl p-1.5 border border-gray-200/90 shadow-xs">
        <div className="grid grid-cols-2 gap-1.5">
          {SUB_TABS.map((st) => (
            <button
              key={st.id}
              onClick={() => setSubTab(st.id)}
              className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                subTab === st.id ? "text-white" : "text-gray-600 hover:bg-gray-100 hover:text-black"
              }`}
            >
              {subTab === st.id && (
                <motion.span
                  layoutId="stocks-casino-subtab-active-bg"
                  className="absolute inset-0 bg-[#948154] rounded-xl shadow-xs"
                  transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                <st.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{st.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Panels ── */}
      <AnimatedTabPanel active={subTab === "stocks"}>
        <AdminErrorBoundary>
          <StocksTab onNavigateToProjects={onNavigateToProjects} />
        </AdminErrorBoundary>
      </AnimatedTabPanel>

      <AnimatedTabPanel active={subTab === "casino"}>
        <AdminErrorBoundary>
          <CasinoTab />
        </AdminErrorBoundary>
      </AnimatedTabPanel>
    </div>
  );
}
