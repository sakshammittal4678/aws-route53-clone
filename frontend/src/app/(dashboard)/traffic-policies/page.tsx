"use client";

import React from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";

export default function TrafficPoliciesPage() {
  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Traffic policies", href: "/traffic-policies" },
        ]}
      />
      <Container
        header={<Header variant="h2">Traffic policies</Header>}
      >
        <Box textAlign="center" padding="xxl" color="text-status-inactive">
          <SpaceBetween size="m">
            <Box variant="h3">Traffic Flow Policy Engine</Box>
            <Box variant="p">
              Traffic policies let you route internet traffic using a variety of routing types, including latency-based, endpoint health, and geolocation.
            </Box>
            <Badge color="grey">Coming Soon</Badge>
          </SpaceBetween>
        </Box>
      </Container>
    </SpaceBetween>
  );
}
