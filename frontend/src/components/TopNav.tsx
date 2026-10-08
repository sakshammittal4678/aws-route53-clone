"use client";

import React, { useState } from "react";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useAuth } from "@/lib/auth-context";
import { useThemeMode } from "./ThemeModeManager";
import { Mode } from "@cloudscape-design/global-styles";

interface TopNavProps {
  onOpenShortcuts?: () => void;
}

export default function TopNav({ onOpenShortcuts }: TopNavProps) {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [searchValue, setSearchValue] = useState("");

  const accountId = user?.account_id || "1234-5678-9012";
  const displayName = user?.username || "Paul Philip";

  return (
    <div id="aws-top-navigation">
      <TopNavigation
        identity={{
          href: "/hosted-zones",
          title: "Amazon Route 53",
          logo: {
            src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 24' width='40' height='24'><path fill='%23FF9900' d='M20.2 16.4c-4.3 0-8.1 1.6-11.2 4.2-.4.3-.2.8.2.8 1.4 0 2.8-.2 4.1-.6 2.1-.6 4.4-.9 6.9-.9 2.5 0 4.8.3 6.9.9 1.3.4 2.7.6 4.1.6.4 0 .6-.5.2-.8-3.1-2.6-6.9-4.2-11.2-4.2z'/><path fill='white' d='M10.5 13.8l-1.3-4.3c-.3-.9-.6-2.3-.8-3.2h-.1c-.2.9-.5 2.3-.8 3.2L6.2 13.8h4.3zm-5.7 3.3l3.6-11.9h2.9l3.6 11.9h-2.3l-.8-2.8H7.3l-.8 2.8H4.8zm12.5 0l2.7-11.9h2.3l1.8 7.6c.3 1.3.6 2.8.8 3.8h.1c.2-1 .5-2.5.8-3.8l1.8-7.6h2.2l2.7 11.9h-2.2l-1.4-6.9c-.3-1.4-.5-2.8-.7-3.9h-.1c-.2 1.1-.5 2.5-.8 3.9l-1.5 6.9h-2l-1.5-6.9c-.3-1.4-.6-2.8-.8-3.9h-.1c-.2 1.1-.4 2.5-.7 3.9l-1.4 6.9h-2.2z'/></svg>",
            alt: "AWS",
          },
        }}
        search={
          <div className="flex items-center">
            <input
              type="text"
              id="global-search-input"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search [Option+S]"
              className="w-80 px-3 py-1 text-sm rounded bg-[#16191f] text-white border border-gray-600 focus:outline-none focus:border-[#ec7211]"
            />
          </div>
        }
        utilities={[
          {
            type: "button",
            iconName: "status-info",
            title: "Keyboard Shortcuts (?)",
            ariaLabel: "Keyboard Shortcuts",
            onClick: () => onOpenShortcuts && onOpenShortcuts(),
          },
          {
            type: "button",
            text: mode === Mode.Dark ? "Light Mode" : "Dark Mode",
            iconName: mode === Mode.Dark ? "view-full" : "status-positive",
            onClick: toggleMode,
          },
          {
            type: "menu-dropdown",
            text: "Global",
            iconName: "globe",
            items: [
              { id: "global", text: "Global (Route 53 Global Service)" },
              { id: "us-east-1", text: "US East (N. Virginia) us-east-1" },
              { id: "us-west-2", text: "US West (Oregon) us-west-2" },
              { id: "eu-west-1", text: "Europe (Ireland) eu-west-1" },
            ],
          },
          {
            type: "menu-dropdown",
            text: displayName,
            description: `Account: ${accountId}`,
            iconName: "user-profile",
            items: [
              { id: "account_id", text: `AWS Account ID: ${accountId}` },
              { id: "role", text: "IAM Role: AdministratorAccess" },
              { id: "signout", text: "Sign out" },
            ],
            onItemClick: (e) => {
              if (e.detail.id === "signout") {
                logout();
              }
            },
          },
        ]}
      />
    </div>
  );
}
