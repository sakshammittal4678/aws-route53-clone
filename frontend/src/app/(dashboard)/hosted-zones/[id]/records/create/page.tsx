"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import Select from "@cloudscape-design/components/select";
import Toggle from "@cloudscape-design/components/toggle";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ExpandableSection from "@cloudscape-design/components/expandable-section";

import { fetchApi } from "@/lib/api";
import { HostedZone, RecordType, RoutingPolicyType } from "@/lib/types";

const RECORD_TYPES: { label: string; value: RecordType; description: string; placeholder: string }[] = [
  {
    label: "A – Routes traffic to an IPv4 address and some AWS resources",
    value: "A",
    description: "An IPv4 address in dotted decimal notation",
    placeholder: "192.0.2.1\n198.51.100.1",
  },
  {
    label: "AAAA – Routes traffic to an IPv6 address and some AWS resources",
    value: "AAAA",
    description: "An IPv6 address in colon-separated hexadecimal notation",
    placeholder: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
  },
  {
    label: "CNAME – Routes traffic to another domain name and some AWS resources",
    value: "CNAME",
    description: "A fully qualified domain name",
    placeholder: "example.com",
  },
  {
    label: "TXT – Can be used to verify domain ownership and configure email security",
    value: "TXT",
    description: "Text enclosed in quotation marks",
    placeholder: '"v=spf1 include:_spf.google.com ~all"',
  },
  {
    label: "MX – Routes traffic to a mail server",
    value: "MX",
    description: "Priority followed by mail server hostname",
    placeholder: "10 mail.example.com",
  },
  {
    label: "NS – Routes traffic to name servers for a delegated zone",
    value: "NS",
    description: "Name server domain name",
    placeholder: "ns-1.awsdns.com",
  },
  {
    label: "PTR – Resolves an IP address to a domain name",
    value: "PTR",
    description: "Domain name for reverse lookup",
    placeholder: "server.example.com",
  },
  {
    label: "SRV – Specifies the location of services like servers or VoIP",
    value: "SRV",
    description: "Priority weight port target",
    placeholder: "10 5 5060 sip.example.com",
  },
  {
    label: "CAA – Specifies which certificate authorities are allowed to issue certificates",
    value: "CAA",
    description: "Flags tag value",
    placeholder: '0 issue "amazon.com"',
  },
];

export default function CreateRecordPage() {
  const params = useParams();
  const router = useRouter();
  const zoneId = params.id as string;

  const [zone, setZone] = useState<HostedZone | null>(null);
  const [recordNamePrefix, setRecordNamePrefix] = useState("");
  const [selectedType, setSelectedType] = useState(RECORD_TYPES[0]);
  const [isAlias, setIsAlias] = useState(false);
  const [aliasTarget, setAliasTarget] = useState("");
  const [valueText, setValueText] = useState("");
  const [ttl, setTtl] = useState("300");
  
  // Routing policy: Simple or Weighted only
  const [routingPolicy, setRoutingPolicy] = useState<{ label: string; value: RoutingPolicyType }>({
    label: "Simple routing",
    value: "Simple",
  });
  const [weight, setWeight] = useState("100");
  const [setIdentifier, setSetIdentifier] = useState("");
  const [evaluateHealth, setEvaluateHealth] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApi<HostedZone>(`/hosted-zones/${zoneId}`)
      .then(setZone)
      .catch((err) => setError(err.message));
  }, [zoneId]);

  const handleSubmit = async () => {
    if (!zone) return;

    if (!isAlias && !valueText.trim()) {
      setError("At least one record value is required.");
      return;
    }
    if (isAlias && !aliasTarget.trim()) {
      setError("Alias target domain is required.");
      return;
    }

    if (routingPolicy.value === "Weighted") {
      if (!setIdentifier.trim()) {
        setError("Record ID / Differentiator is required for Weighted routing policy.");
        return;
      }
      const numWeight = parseInt(weight, 10);
      if (isNaN(numWeight) || numWeight < 0 || numWeight > 255) {
        setError("Weight must be an integer between 0 and 255.");
        return;
      }
    }

    setError(null);
    setLoading(true);

    try {
      const parsedRecords = valueText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const payload: any = {
        name: recordNamePrefix.trim() ? `${recordNamePrefix.trim()}.${zone.name}` : zone.name,
        type: selectedType.value,
        routing_policy: routingPolicy.value,
        set_identifier: routingPolicy.value === "Weighted" ? setIdentifier.trim() : "",
        weight: routingPolicy.value === "Weighted" ? parseInt(weight, 10) : undefined,
        ttl: parseInt(ttl, 10) || 300,
        records: isAlias ? [] : parsedRecords,
        is_alias: isAlias,
        alias_target: isAlias ? aliasTarget.trim() : undefined,
        evaluate_target_health: evaluateHealth,
      };

      await fetchApi(`/hosted-zones/${zoneId}/records`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push(`/hosted-zones/${zoneId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create DNS record.");
      setLoading(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Hosted zones", href: "/hosted-zones" },
          { text: zone?.name || zoneId, href: `/hosted-zones/${zoneId}` },
          { text: "Create record", href: `/hosted-zones/${zoneId}/records/create` },
        ]}
        ariaLabel="Breadcrumbs"
      />

      {/* Record creation method banner matching screenshot */}
      <ExpandableSection headerText="Record creation method" defaultExpanded>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2 text-sm">
          <div>
            <h4 className="font-semibold text-white mb-1">
              Quick create (recommended for expert users)
            </h4>
            <p className="text-gray-400">
              Choose this method if you are confident in the process of creating records and know which options you need.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">
              Wizard (recommended for new users)
            </h4>
            <p className="text-gray-400">
              Choose this method if you need more explanations as you create your record.
            </p>
          </div>
        </div>
      </ExpandableSection>

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
                onClick={() => router.push(`/hosted-zones/${zoneId}`)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={loading}
                onClick={handleSubmit}
              >
                Create records
              </Button>
            </SpaceBetween>
          }
          errorText={error}
        >
          <Container
            header={
              <Header
                variant="h2"
                info={<span className="text-xs text-blue-400 cursor-pointer">Info</span>}
              >
                Quick create record
              </Header>
            }
          >
            <SpaceBetween size="l">
              <Header variant="h3">Record 1</Header>

              {/* Record Name */}
              <FormField
                label="Record name"
                description="Keep blank to create a record for the root domain."
              >
                <div className="flex items-center gap-2">
                  <div className="w-64">
                    <Input
                      value={recordNamePrefix}
                      onChange={(e) => setRecordNamePrefix(e.detail.value)}
                      placeholder="www"
                    />
                  </div>
                  <span className="font-mono text-gray-300 font-semibold">
                    .{zone?.name || "example.com."}
                  </span>
                </div>
              </FormField>

              {/* Record Type */}
              <FormField label="Record type">
                <Select
                  selectedOption={selectedType}
                  onChange={(e) =>
                    setSelectedType(e.detail.selectedOption as any)
                  }
                  options={RECORD_TYPES}
                />
              </FormField>

              {/* Alias Toggle */}
              <FormField label="Alias">
                <Toggle
                  checked={isAlias}
                  onChange={(e) => setIsAlias(e.detail.checked)}
                >
                  {isAlias ? "Yes" : "No"}
                </Toggle>
              </FormField>

              {/* Value or Alias Target */}
              {isAlias ? (
                <FormField
                  label="Route traffic to"
                  description="Choose an AWS endpoint or type target domain."
                >
                  <Input
                    value={aliasTarget}
                    onChange={(e) => setAliasTarget(e.detail.value)}
                    placeholder="dualstack.my-elb-123456.us-east-1.elb.amazonaws.com"
                  />
                </FormField>
              ) : (
                <FormField
                  label="Value"
                  description={selectedType.description}
                  constraintText="Enter each value on a separate line for multiple records."
                >
                  <Textarea
                    value={valueText}
                    onChange={(e) => setValueText(e.detail.value)}
                    placeholder={selectedType.placeholder}
                    rows={4}
                  />
                </FormField>
              )}

              {/* TTL */}
              {!isAlias && (
                <FormField
                  label="TTL (seconds)"
                  description="The amount of time in seconds that a DNS resolver caches the response."
                >
                  <div className="w-48">
                    <Input
                      type="number"
                      value={ttl}
                      onChange={(e) => setTtl(e.detail.value)}
                      placeholder="300"
                    />
                  </div>
                </FormField>
              )}

              {/* Routing Policy (Simple or Weighted only!) */}
              <FormField label="Routing policy">
                <Select
                  selectedOption={routingPolicy}
                  onChange={(e) =>
                    setRoutingPolicy(e.detail.selectedOption as any)
                  }
                  options={[
                    { label: "Simple routing", value: "Simple" },
                    { label: "Weighted", value: "Weighted" },
                  ]}
                />
              </FormField>

              {/* If Weighted */}
              {routingPolicy.value === "Weighted" && (
                <div className="p-4 bg-[#16191f] border border-gray-700 rounded space-y-4">
                  <Header variant="h3">Weighted routing configuration</Header>
                  <FormField
                    label="Weight"
                    description="A value from 0 through 255 that determines what proportion of traffic is routed to this resource."
                  >
                    <div className="w-32">
                      <Input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.detail.value)}
                        placeholder="100"
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Record ID / Set identifier"
                    description="A differentiator that uniquely identifies this record among others with the same name and type."
                  >
                    <Input
                      value={setIdentifier}
                      onChange={(e) => setSetIdentifier(e.detail.value)}
                      placeholder="e.g. primary-us-east-cluster"
                    />
                  </FormField>
                </div>
              )}

              {/* Evaluate target health */}
              <FormField label="Evaluate target health">
                <Toggle
                  checked={evaluateHealth}
                  onChange={(e) => setEvaluateHealth(e.detail.checked)}
                >
                  {evaluateHealth ? "Yes" : "No"}
                </Toggle>
              </FormField>
            </SpaceBetween>
          </Container>
        </Form>
      </form>
    </SpaceBetween>
  );
}
