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
import Alert from "@cloudscape-design/components/alert";

import { fetchApi } from "@/lib/api";
import { HostedZone, DNSRecord, RoutingPolicyType } from "@/lib/types";

export default function EditRecordPage() {
  const params = useParams();
  const router = useRouter();
  const zoneId = params.id as string;
  const recordId = params.recordId as string;

  const [zone, setZone] = useState<HostedZone | null>(null);
  const [record, setRecord] = useState<DNSRecord | null>(null);

  const [valueText, setValueText] = useState("");
  const [ttl, setTtl] = useState("300");
  const [routingPolicy, setRoutingPolicy] = useState<{ label: string; value: RoutingPolicyType }>({
    label: "Simple routing",
    value: "Simple",
  });
  const [weight, setWeight] = useState("100");
  const [setIdentifier, setSetIdentifier] = useState("");
  const [isAlias, setIsAlias] = useState(false);
  const [aliasTarget, setAliasTarget] = useState("");
  const [evaluateHealth, setEvaluateHealth] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchApi<HostedZone>(`/hosted-zones/${zoneId}`),
      fetchApi<DNSRecord>(`/hosted-zones/${zoneId}/records/${recordId}`),
    ])
      .then(([zoneData, recData]) => {
        setZone(zoneData);
        setRecord(recData);
        setValueText(recData.records.join("\n"));
        setTtl(recData.ttl.toString());
        setRoutingPolicy({
          label: recData.routing_policy === "Weighted" ? "Weighted" : "Simple routing",
          value: recData.routing_policy,
        });
        setWeight(recData.weight ? recData.weight.toString() : "100");
        setSetIdentifier(recData.set_identifier || "");
        setIsAlias(recData.is_alias);
        setAliasTarget(recData.alias_target || "");
        setEvaluateHealth(recData.evaluate_target_health);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [zoneId, recordId]);

  const handleSubmit = async () => {
    if (!record) return;

    if (!isAlias && !valueText.trim()) {
      setError("At least one record value is required.");
      return;
    }
    if (isAlias && !aliasTarget.trim()) {
      setError("Alias target is required when alias is enabled.");
      return;
    }

    if (routingPolicy.value === "Weighted") {
      if (!setIdentifier.trim()) {
        setError("Record ID / Differentiator is required for Weighted policy.");
        return;
      }
      const numWeight = parseInt(weight, 10);
      if (isNaN(numWeight) || numWeight < 0 || numWeight > 255) {
        setError("Weight must be between 0 and 255.");
        return;
      }
    }

    setError(null);
    setSaving(true);

    try {
      const parsedRecords = valueText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const payload: any = {
        records: isAlias ? [] : parsedRecords,
        ttl: parseInt(ttl, 10) || 300,
        routing_policy: routingPolicy.value,
        set_identifier: routingPolicy.value === "Weighted" ? setIdentifier.trim() : "",
        weight: routingPolicy.value === "Weighted" ? parseInt(weight, 10) : undefined,
        is_alias: isAlias,
        alias_target: isAlias ? aliasTarget.trim() : undefined,
        evaluate_target_health: evaluateHealth,
      };

      await fetchApi(`/hosted-zones/${zoneId}/records/${recordId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      router.push(`/hosted-zones/${zoneId}`);
    } catch (err: any) {
      setError(err.message || "Failed to update record.");
      setSaving(false);
    }
  };

  const isApexNsOrSoa = Boolean(
    record &&
      zone &&
      (record.type === "NS" || record.type === "SOA") &&
      record.name.replace(/\.$/, "") === zone.name.replace(/\.$/, "")
  );

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Hosted zones", href: "/hosted-zones" },
          { text: zone?.name || zoneId, href: `/hosted-zones/${zoneId}` },
          { text: "Edit record", href: `/hosted-zones/${zoneId}/records/${recordId}/edit` },
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
                onClick={() => router.push(`/hosted-zones/${zoneId}`)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={saving}
                disabled={loading}
                onClick={handleSubmit}
              >
                Save changes
              </Button>
            </SpaceBetween>
          }
          errorText={error}
        >
          <Container
            header={
              <Header
                variant="h2"
                description={`Edit DNS record configuration for ${record?.name || ""}`}
              >
                Edit record
              </Header>
            }
          >
            {isApexNsOrSoa && (
              <div className="mb-4">
                <Alert type="info">
                  This is a default apex {record?.type} record automatically managed by AWS Route 53. You can adjust the TTL or name servers, but the record type and apex association cannot be modified.
                </Alert>
              </div>
            )}

            <SpaceBetween size="l">
              <FormField label="Record name">
                <div className="font-mono text-base font-semibold text-white p-2 bg-[#16191f] border border-gray-700 rounded">
                  {record?.name}
                </div>
              </FormField>

              <FormField label="Record type">
                <div className="font-semibold text-white p-2 bg-[#16191f] border border-gray-700 rounded">
                  {record?.type}
                </div>
              </FormField>

              <FormField label="Alias">
                <Toggle
                  checked={isAlias}
                  onChange={(e) => setIsAlias(e.detail.checked)}
                  disabled={isApexNsOrSoa}
                >
                  {isAlias ? "Yes" : "No"}
                </Toggle>
              </FormField>

              {isAlias ? (
                <FormField label="Route traffic to">
                  <Input
                    value={aliasTarget}
                    onChange={(e) => setAliasTarget(e.detail.value)}
                    placeholder="dualstack.my-elb-123456.us-east-1.elb.amazonaws.com"
                  />
                </FormField>
              ) : (
                <FormField
                  label="Value"
                  description="One record value per line"
                >
                  <Textarea
                    value={valueText}
                    onChange={(e) => setValueText(e.detail.value)}
                    rows={5}
                  />
                </FormField>
              )}

              {!isAlias && (
                <FormField label="TTL (seconds)">
                  <div className="w-48">
                    <Input
                      type="number"
                      value={ttl}
                      onChange={(e) => setTtl(e.detail.value)}
                    />
                  </div>
                </FormField>
              )}

              <FormField label="Routing policy">
                <Select
                  selectedOption={routingPolicy}
                  disabled={isApexNsOrSoa}
                  onChange={(e) =>
                    setRoutingPolicy(e.detail.selectedOption as any)
                  }
                  options={[
                    { label: "Simple routing", value: "Simple" },
                    { label: "Weighted", value: "Weighted" },
                  ]}
                />
              </FormField>

              {routingPolicy.value === "Weighted" && (
                <div className="p-4 bg-[#16191f] border border-gray-700 rounded space-y-4">
                  <Header variant="h3">Weighted routing configuration</Header>
                  <FormField label="Weight">
                    <div className="w-32">
                      <Input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.detail.value)}
                      />
                    </div>
                  </FormField>

                  <FormField label="Record ID / Set identifier">
                    <Input
                      value={setIdentifier}
                      onChange={(e) => setSetIdentifier(e.detail.value)}
                    />
                  </FormField>
                </div>
              )}

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
