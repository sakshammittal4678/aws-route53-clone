"use client";

import React from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";

export default function ResolverPage() {
  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Resolver", href: "/resolver" },
        ]}
      />
      <Container
        header={<Header variant="h2">Route 53 Resolver</Header>}
      >
        <Box textAlign="center" padding="xxl" color="text-status-inactive">
          <SpaceBetween size="m">
            <Box variant="h3">Route 53 Resolver Endpoints</Box>
            <Box variant="p">
              Amazon Route 53 Resolver responds recursively to DNS queries from AWS resources for public records and private hosted zones.
            </Box>
            <Badge color="grey">Coming Soon</Badge>
          </SpaceBetween>
        </Box>
      </Container>
    </SpaceBetween>
  );
}
