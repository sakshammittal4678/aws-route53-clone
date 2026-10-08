"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Select from "@cloudscape-design/components/select";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Alert from "@cloudscape-design/components/alert";

import { fetchApi } from "@/lib/api";
import { HostedZone } from "@/lib/types";

export default function CreateHostedZonePage() {
  const router = useRouter();

  const [domainName, setDomainName] = useState("");
  const [description, setDescription] = useState("");
  const [zoneType, setZoneType] = useState<"Public" | "Private">("Public");
  const [vpcRegion, setVpcRegion] = useState<{ label: string; value: string }>({
    label: "US East (N. Virginia) us-east-1",
    value: "us-east-1",
  });
  const [vpcId, setVpcId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!domainName.trim()) {
      setError("Domain name is required.");
      return;
    }
    if (zoneType === "Private" && !vpcId.trim()) {
      setError("VPC ID is required for a Private hosted zone.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        name: domainName.trim(),
        description: description.trim() || undefined,
        type: zoneType,
      };

      if (zoneType === "Private") {
        payload.vpc_id = vpcId.trim();
        payload.vpc_region = vpcRegion.value;
      }

      const res = await fetchApi<HostedZone>("/hosted-zones", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push(`/hosted-zones/${res.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create hosted zone.");
      setLoading(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Hosted zones", href: "/hosted-zones" },
          { text: "Create hosted zone", href: "/hosted-zones/create" },
        ]}
        ariaLabel="Breadcrumbs"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => router.push("/hosted-zones")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={loading}
                onClick={handleSubmit}
              >
                Create hosted zone
              </Button>
            </SpaceBetween>
          }
          errorText={error}
        >
          <Container
            header={
              <Header
                variant="h2"
                description="A hosted zone is a container that holds information about how you want to route traffic for a domain, such as example.com, and its subdomains."
              >
                Hosted zone configuration
              </Header>
            }
          >
            <SpaceBetween size="l">
              <FormField
                label="Domain name"
                description="This is the name of the domain that you want to route traffic for."
                constraintText="Valid characters: a-z, 0-9, ! &quot; # $ % & ' ( ) * + , - / : ; < = > ? @ [ \ ] ^ _ ` { | } . ~"
              >
                <Input
                  value={domainName}
                  onChange={(e) => setDomainName(e.detail.value)}
                  placeholder="example.com"
                  autoFocus
                />
              </FormField>

              <FormField
                label="Description - optional"
                description="This value lets you distinguish hosted zones that have the same name."
                constraintText={`The description can have up to 256 characters. ${description.length}/256`}
              >
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.detail.value)}
                  placeholder="The hosted zone is used for..."
                  rows={3}
                />
              </FormField>

              <FormField
                label="Type"
                description="The type indicates whether you want to route traffic on the internet or in an Amazon VPC."
              >
                <RadioGroup
                  value={zoneType}
                  onChange={(e) => setZoneType(e.detail.value as any)}
                  items={[
                    {
                      value: "Public",
                      label: "Public hosted zone",
                      description:
                        "Routes traffic on the internet. Recommended if this domain is public.",
                    },
                    {
                      value: "Private",
                      label: "Private hosted zone",
                      description:
                        "Routes traffic within an Amazon VPC that you associate with the hosted zone.",
                    },
                  ]}
                />
              </FormField>

              {zoneType === "Private" && (
                <div className="pt-4 border-t border-gray-700/60 space-y-4">
                  <Header variant="h3">VPC to associate with the private hosted zone</Header>
                  <FormField label="VPC Region">
                    <Select
                      selectedOption={vpcRegion}
                      onChange={(e) => setVpcRegion(e.detail.selectedOption as any)}
                      options={[
                        { label: "US East (N. Virginia) us-east-1", value: "us-east-1" },
                        { label: "US West (Oregon) us-west-2", value: "us-west-2" },
                        { label: "Europe (Ireland) eu-west-1", value: "eu-west-1" },
                      ]}
                    />
                  </FormField>

                  <FormField
                    label="VPC ID"
                    description="Enter the VPC ID (e.g. vpc-0a1b2c3d4e5f67890)"
                  >
                    <Input
                      value={vpcId}
                      onChange={(e) => setVpcId(e.detail.value)}
                      placeholder="vpc-01a2b3c4d5e6f7g8h"
                    />
                  </FormField>
                </div>
              )}
            </SpaceBetween>
          </Container>
        </Form>
      </form>
    </SpaceBetween>
  );
}
