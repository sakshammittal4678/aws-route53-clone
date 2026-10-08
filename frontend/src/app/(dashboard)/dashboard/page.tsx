"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Box from "@cloudscape-design/components/box";

export default function DashboardPage() {
  const router = useRouter();

  const sections = [
    {
      title: "DNS management",
      description:
        "A hosted zone tells Route 53 how to respond to DNS queries for a domain such as example.com.",
      buttonText: "Create hosted zone",
      action: () => router.push("/hosted-zones/create"),
    },
    {
      title: "Traffic management",
      description:
        "A visual tool that lets you easily create policies for multiple endpoints in complex configurations.",
      buttonText: "Create policy",
      action: () => router.push("/traffic-policies"),
    },
    {
      title: "Availability monitoring",
      description:
        "Health checks monitor your applications and web resources, and direct DNS queries to healthy resources.",
      buttonText: "Create health check",
      action: () => router.push("/health-checks"),
    },
    {
      title: "Domain registration",
      description:
        "A domain is the name, such as example.com, that your users use to access your application.",
      buttonText: "Register domain",
      action: () => router.push("/hosted-zones"),
    },
  ];

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Dashboard", href: "/dashboard" },
        ]}
        ariaLabel="Breadcrumbs"
      />

      <Header
        variant="h1"
        info={<span className="text-xs text-blue-400 cursor-pointer">Info</span>}
      >
        Route 53 Dashboard
      </Header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((sec, idx) => (
          <Container key={idx}>
            <div className="flex flex-col items-center text-center p-6 space-y-4">
              <Header variant="h2">{sec.title}</Header>
              <p className="text-gray-300 max-w-sm text-sm">
                {sec.description}
              </p>
              <div className="pt-2">
                <Button onClick={sec.action}>{sec.buttonText}</Button>
              </div>
            </div>
          </Container>
        ))}
      </div>
    </SpaceBetween>
  );
}
