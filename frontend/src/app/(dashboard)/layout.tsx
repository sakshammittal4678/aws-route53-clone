"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@cloudscape-design/components/app-layout";
import TopNav from "@/components/TopNav";
import Route53SideNav from "@/components/Route53SideNav";
import ShortcutsHelpModal from "@/components/ShortcutsHelpModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shortcutsModalVisible, setShortcutsModalVisible] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(true);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input/textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (!isInput && e.key === "?") {
        e.preventDefault();
        setShortcutsModalVisible((prev) => !prev);
      } else if (
        (e.altKey && (e.key === "s" || e.key === "S")) ||
        (!isInput && e.key === "/")
      ) {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        if (searchInput) searchInput.focus();
      } else if (e.key === "Escape") {
        setShortcutsModalVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1b2a] flex flex-col">
      <TopNav onOpenShortcuts={() => setShortcutsModalVisible(true)} />
      <div className="flex-1">
        <AppLayout
          navigation={<Route53SideNav />}
          navigationOpen={navigationOpen}
          onNavigationChange={(e) => setNavigationOpen(e.detail.open)}
          content={children}
          toolsHide={true}
        />
      </div>

      <ShortcutsHelpModal
        visible={shortcutsModalVisible}
        onDismiss={() => setShortcutsModalVisible(false)}
      />
    </div>
  );
}
