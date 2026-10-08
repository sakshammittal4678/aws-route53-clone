"use client";

import React from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";

export default function HealthChecksPage() {
  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Health checks", href: "/health-checks" },
        ]}
      />
      <Container
        header={<Header variant="h2">Route 53 Health Checks</Header>}
      >
        <Box textAlign="center" padding="xxl" color="text-status-inactive">
          <SpaceBetween size="m">
            <Box variant="h3">Endpoint Health Checks</Box>
            <Box variant="p">
              Amazon Route 53 health checks monitor the health and performance of your web applications, web servers, and other resources.
            </Box>
            <Badge color="grey">Coming Soon</Badge>
          </SpaceBetween>
        </Box>
      </Container>
    </SpaceBetween>
  );
}
