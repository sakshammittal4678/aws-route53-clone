"use client";

import React from "react";
import SideNavigation, {
  SideNavigationProps,
} from "@cloudscape-design/components/side-navigation";
import { usePathname, useRouter } from "next/navigation";

export default function Route53SideNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeHref = pathname.startsWith("/hosted-zones")
    ? "/hosted-zones"
    : pathname;

  const navItems: SideNavigationProps.Item[] = [
    { type: "link", text: "Dashboard", href: "/dashboard" },
    { type: "link", text: "Hosted zones", href: "/hosted-zones" },
    { type: "link", text: "Health checks", href: "/health-checks" },
    {
      type: "link",
      text: "Profiles",
      href: "/profiles",
      info: <span className="text-xs bg-[#0972d3] text-white px-1.5 py-0.5 rounded font-semibold">New</span>,
    },
    { type: "divider" },
    {
      type: "section",
      text: "IP-based routing",
      items: [
        { type: "link", text: "CIDR collections", href: "/resolver" },
      ],
    },
    {
      type: "section",
      text: "Traffic flow",
      items: [
        { type: "link", text: "Traffic policies", href: "/traffic-policies" },
        { type: "link", text: "Policy records", href: "/traffic-policies" },
      ],
    },
    {
      type: "section",
      text: "Domains",
      items: [
        { type: "link", text: "Registered domains", href: "/dashboard" },
        { type: "link", text: "Requests", href: "/dashboard" },
      ],
    },
    {
      type: "section",
      text: "Resolver",
      items: [
        { type: "link", text: "VPCs", href: "/resolver" },
        { type: "link", text: "Inbound endpoints", href: "/resolver" },
      ],
    },
  ];

  return (
    <SideNavigation
      activeHref={activeHref}
      header={{ href: "/dashboard", text: "Route 53" }}
      items={navItems}
      onFollow={(event) => {
        if (!event.detail.external) {
          event.preventDefault();
          router.push(event.detail.href);
        }
      }}
    />
  );
}
