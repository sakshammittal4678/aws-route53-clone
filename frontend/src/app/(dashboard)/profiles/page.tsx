"use client";

import React from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";

export default function ProfilesPage() {
  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Profiles", href: "/profiles" },
        ]}
      />
      <Container
        header={
          <Header
            variant="h2"
            info={<Badge color="blue">New</Badge>}
          >
            Route 53 Profiles
          </Header>
        }
      >
        <Box textAlign="center" padding="xxl" color="text-status-inactive">
          <SpaceBetween size="m">
            <Box variant="h3">Route 53 Profiles Configuration</Box>
            <Box variant="p">
              Route 53 Profiles lets you create and manage a standard DNS configuration that can be shared across multiple VPCs and AWS accounts.
            </Box>
            <Badge color="grey">Coming Soon</Badge>
          </SpaceBetween>
        </Box>
      </Container>
    </SpaceBetween>
  );
}
