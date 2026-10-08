"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Table from "@cloudscape-design/components/table";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Pagination from "@cloudscape-design/components/pagination";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import Tabs from "@cloudscape-design/components/tabs";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import Badge from "@cloudscape-design/components/badge";

import { HostedZone, DNSRecord } from "@/lib/types";
import { fetchApi } from "@/lib/api";
import DeleteModal from "@/components/DeleteModal";
import BindImportModal from "@/components/BindImportModal";
import ExportModal from "@/components/ExportModal";

export default function ZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const zoneId = params.id as string;

  const [zone, setZone] = useState<HostedZone | null>(null);
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<DNSRecord[]>([]);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<{ label: string; value: string }>({
    label: "All types",
    value: "All",
  });
  const [routingFilter, setRoutingFilter] = useState<{ label: string; value: string }>({
    label: "All routing policies",
    value: "All",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Modals & Panels
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bindModalVisible, setBindModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<FlashbarProps.MessageDefinition[]>([]);

  // Load zone metadata
  const loadZone = useCallback(async () => {
    try {
      const data = await fetchApi<HostedZone>(`/hosted-zones/${zoneId}`);
      setZone(data);
    } catch (err: any) {
      setNotifications([
        {
          type: "error",
          content: err.message || "Failed to load hosted zone.",
          dismissible: true,
          id: "err-zone",
          onDismiss: () => setNotifications([]),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  // Load records
  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const urlParams = new URLSearchParams({
        skip: skip.toString(),
        limit: pageSize.toString(),
        sort_by: "name",
        order: "asc",
      });
      if (searchQuery.trim()) urlParams.set("query", searchQuery.trim());
      if (typeFilter.value && typeFilter.value !== "All") urlParams.set("type", typeFilter.value);
      if (routingFilter.value && routingFilter.value !== "All") urlParams.set("routing_policy", routingFilter.value);

      const res = await fetchApi<{ items: DNSRecord[]; total: number }>(
        `/hosted-zones/${zoneId}/records?${urlParams.toString()}`
      );
      setRecords(res.items);
      setTotalRecords(res.total);
    } catch (err: any) {
      setNotifications([
        {
          type: "error",
          content: err.message || "Failed to load DNS records.",
          dismissible: true,
          id: "err-recs",
          onDismiss: () => setNotifications([]),
        },
      ]);
    } finally {
      setRecordsLoading(false);
    }
  }, [zoneId, currentPage, searchQuery, typeFilter, routingFilter]);

  useEffect(() => {
    loadZone();
  }, [loadZone]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Handle record delete
  const handleDeleteRecords = async () => {
    if (selectedRecords.length === 0) return;
    setDeleteLoading(true);
    try {
      const ids = selectedRecords.map((r) => r.id);
      const res = await fetchApi<any>(`/hosted-zones/${zoneId}/records/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ record_ids: ids }),
      });

      setNotifications([
        {
          type: res.skipped_ids?.length ? "info" : "success",
          content: res.message || `Deleted ${res.deleted_count} record(s).`,
          dismissible: true,
          id: "del-rec-res",
          onDismiss: () => setNotifications([]),
        },
      ]);
      setSelectedRecords([]);
      setDeleteModalVisible(false);
      loadRecords();
      loadZone();
    } catch (err: any) {
      setNotifications([
        {
          type: "error",
          content: err.message || "Failed to delete record(s).",
          dismissible: true,
          id: "del-rec-err",
          onDismiss: () => setNotifications([]),
        },
      ]);
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectedRecord = selectedRecords.length === 1 ? selectedRecords[0] : null;

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Hosted zones", href: "/hosted-zones" },
          { text: zone?.name || zoneId, href: `/hosted-zones/${zoneId}` },
        ]}
        ariaLabel="Breadcrumbs"
      />

      {notifications.length > 0 && <Flashbar items={notifications} />}

      <Tabs
        tabs={[
          {
            label: "Records",
            id: "records-tab",
            content: (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Main Table Column */}
                <div className={selectedRecord ? "lg:col-span-3" : "lg:col-span-4"}>
                  <Table
                    columnDefinitions={[
                      {
                        id: "name",
                        header: "Record name",
                        cell: (item) => (
                          <span className="font-mono text-sm">{item.name}</span>
                        ),
                        sortingField: "name",
                      },
                      {
                        id: "type",
                        header: "Type",
                        cell: (item) => (
                          <Badge color="blue">{item.type}</Badge>
                        ),
                        sortingField: "type",
                      },
                      {
                        id: "routing_policy",
                        header: "Routing policy",
                        cell: (item) => item.routing_policy,
                      },
                      {
                        id: "differentiator",
                        header: "Differentiator",
                        cell: (item) => item.set_identifier || "-",
                      },
                      {
                        id: "alias",
                        header: "Alias",
                        cell: (item) => (item.is_alias ? "Yes" : "No"),
                      },
                      {
                        id: "records",
                        header: "Value/Route traffic to",
                        cell: (item) => (
                          <div className="font-mono text-xs max-w-md whitespace-pre-wrap">
                            {item.is_alias
                              ? item.alias_target
                              : item.records.join("\n")}
                          </div>
                        ),
                      },
                      {
                        id: "ttl",
                        header: "TTL",
                        cell: (item) => `${item.ttl}s`,
                        sortingField: "ttl",
                      },
                      {
                        id: "health",
                        header: "Evaluate target health",
                        cell: (item) => (item.evaluate_target_health ? "Yes" : "No"),
                      },
                    ]}
                    items={records}
                    loading={recordsLoading}
                    loadingText="Loading records..."
                    selectionType="multi"
                    selectedItems={selectedRecords}
                    onSelectionChange={(e) => setSelectedRecords(e.detail.selectedItems)}
                    header={
                      <Header
                        variant="awsui-h1-sticky"
                        counter={`(${totalRecords})`}
                        info={<span className="text-xs text-blue-400 cursor-pointer">Info</span>}
                        description="Automatic mode is the current search behavior optimized for best filter results. To change modes go to settings."
                        actions={
                          <SpaceBetween direction="horizontal" size="xs">
                            <Button
                              iconName="refresh"
                              ariaLabel="Refresh"
                              onClick={loadRecords}
                              loading={recordsLoading}
                            />
                            <Button
                              disabled={selectedRecords.length === 0}
                              onClick={() => setDeleteModalVisible(true)}
                            >
                              Delete record
                            </Button>
                            <Button onClick={() => setBindModalVisible(true)}>
                              Import zone file
                            </Button>
                            <Button onClick={() => setExportModalVisible(true)}>
                              Export records
                            </Button>
                            <Button
                              variant="primary"
                              onClick={() =>
                                router.push(`/hosted-zones/${zoneId}/records/create`)
                              }
                            >
                              Create record
                            </Button>
                          </SpaceBetween>
                        }
                      >
                        Records
                      </Header>
                    }
                    filter={
                      <div className="flex flex-wrap gap-3 items-center mb-3">
                        <div className="flex-1 min-w-[200px]">
                          <Input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.detail.value)}
                            placeholder="Filter records by property or value"
                            clearAriaLabel="Clear"
                          />
                        </div>
                        <div className="w-40">
                          <Select
                            selectedOption={typeFilter}
                            onChange={(e) =>
                              setTypeFilter(e.detail.selectedOption as any)
                            }
                            options={[
                              { label: "All types", value: "All" },
                              { label: "A", value: "A" },
                              { label: "AAAA", value: "AAAA" },
                              { label: "CNAME", value: "CNAME" },
                              { label: "TXT", value: "TXT" },
                              { label: "MX", value: "MX" },
                              { label: "NS", value: "NS" },
                              { label: "PTR", value: "PTR" },
                              { label: "SRV", value: "SRV" },
                              { label: "CAA", value: "CAA" },
                              { label: "SOA", value: "SOA" },
                            ]}
                          />
                        </div>
                        <div className="w-48">
                          <Select
                            selectedOption={routingFilter}
                            onChange={(e) =>
                              setRoutingFilter(e.detail.selectedOption as any)
                            }
                            options={[
                              { label: "All routing policies", value: "All" },
                              { label: "Simple", value: "Simple" },
                              { label: "Weighted", value: "Weighted" },
                            ]}
                          />
                        </div>
                      </div>
                    }
                    pagination={
                      <Pagination
                        currentPageIndex={currentPage}
                        pagesCount={Math.max(1, Math.ceil(totalRecords / pageSize))}
                        onChange={(e) => setCurrentPage(e.detail.currentPageIndex)}
                      />
                    }
                    empty={
                      <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
                        <SpaceBetween size="m">
                          <b>No records found</b>
                          <Box variant="p" color="text-status-inactive">
                            No records match the current filter criteria.
                          </Box>
                        </SpaceBetween>
                      </Box>
                    }
                  />
                </div>

                {/* Split Panel on Record Selection */}
                {selectedRecord && (
                  <div className="lg:col-span-1 border border-gray-700 bg-[#16191f] rounded p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                      <Header variant="h2">Record details</Header>
                      <button
                        onClick={() => setSelectedRecords([])}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    <Button
                      fullWidth
                      onClick={() =>
                        router.push(
                          `/hosted-zones/${zoneId}/records/${selectedRecord.id}/edit`
                        )
                      }
                    >
                      Edit record
                    </Button>

                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold">
                          Record name
                        </div>
                        <div className="font-mono mt-1 break-all text-white">
                          {selectedRecord.name}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold">
                          Record type
                        </div>
                        <div className="mt-1 text-white">{selectedRecord.type}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold">
                          Value
                        </div>
                        <pre className="mt-1 p-2 bg-[#0f1b2a] rounded font-mono text-xs overflow-x-auto text-yellow-300">
                          {selectedRecord.is_alias
                            ? selectedRecord.alias_target
                            : selectedRecord.records.join("\n")}
                        </pre>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold">
                          Alias
                        </div>
                        <div className="mt-1 text-white">
                          {selectedRecord.is_alias ? "Yes" : "No"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold">
                          TTL (seconds)
                        </div>
                        <div className="mt-1 text-white">{selectedRecord.ttl}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold">
                          Routing policy
                        </div>
                        <div className="mt-1 text-white">
                          {selectedRecord.routing_policy}
                        </div>
                      </div>

                      {selectedRecord.routing_policy === "Weighted" && (
                        <>
                          <div>
                            <div className="text-xs text-gray-400 uppercase font-semibold">
                              Weight
                            </div>
                            <div className="mt-1 text-white">
                              {selectedRecord.weight ?? "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase font-semibold">
                              Differentiator
                            </div>
                            <div className="mt-1 text-white">
                              {selectedRecord.set_identifier || "-"}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            label: "Hosted zone details",
            id: "details-tab",
            content: (
              <Container
                header={
                  <Header
                    variant="h2"
                    actions={
                      <Button
                        onClick={() =>
                          router.push(`/hosted-zones/${zoneId}`)
                        }
                      >
                        Edit zone details
                      </Button>
                    }
                  >
                    Hosted zone details
                  </Header>
                }
              >
                {zone ? (
                  <ColumnLayout columns={2} variant="text-grid">
                    <KeyValuePairs
                      columns={1}
                      items={[
                        { label: "Hosted zone name", value: zone.name },
                        { label: "Hosted zone ID", value: zone.id },
                        { label: "Type", value: `${zone.type} hosted zone` },
                        { label: "Created by", value: zone.created_by },
                      ]}
                    />
                    <KeyValuePairs
                      columns={1}
                      items={[
                        { label: "Record count", value: zone.record_count.toString() },
                        { label: "Description", value: zone.description || "None" },
                        {
                          label: "VPC ID",
                          value: zone.vpc_id
                            ? `${zone.vpc_id} (${zone.vpc_region})`
                            : "None",
                        },
                        {
                          label: "Created at",
                          value: new Date(zone.created_at).toLocaleString(),
                        },
                      ]}
                    />
                  </ColumnLayout>
                ) : (
                  <div>Loading details...</div>
                )}
              </Container>
            ),
          },
          {
            label: "DNSSEC signing",
            id: "dnssec-tab",
            content: (
              <Container header={<Header variant="h2">DNSSEC signing</Header>}>
                <Box textAlign="center" color="text-status-inactive" padding="l">
                  <SpaceBetween size="m">
                    <Box variant="h3">DNSSEC signing is not configured</Box>
                    <Box variant="p">
                      DNSSEC signs your DNS records so that resolvers can verify that DNS responses were sent by Route 53 and weren't tampered with.
                    </Box>
                    <Badge color="grey">Coming Soon</Badge>
                  </SpaceBetween>
                </Box>
              </Container>
            ),
          },
          {
            label: "Query logging",
            id: "logging-tab",
            content: (
              <Container header={<Header variant="h2">Query logging</Header>}>
                <Box textAlign="center" color="text-status-inactive" padding="l">
                  <SpaceBetween size="m">
                    <Box variant="h3">DNS query logging is not configured</Box>
                    <Box variant="p">
                      Query logging configures Route 53 to log DNS queries for this hosted zone to an Amazon CloudWatch Logs log group.
                    </Box>
                    <Badge color="grey">Coming Soon</Badge>
                  </SpaceBetween>
                </Box>
              </Container>
            ),
          },
        ]}
      />

      <DeleteModal
        visible={deleteModalVisible}
        title={`Delete record${selectedRecords.length > 1 ? "s" : ""}`}
        itemDescription={`${selectedRecords.length} record(s)`}
        itemsList={selectedRecords.map((r) => `${r.name} [${r.type}]`)}
        warningMessage="Permanently delete the selected DNS record(s)? Note: Default apex NS and SOA records are protected and cannot be deleted."
        onDismiss={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteRecords}
        loading={deleteLoading}
      />

      {zone && (
        <>
          <BindImportModal
            visible={bindModalVisible}
            zoneId={zone.id}
            zoneName={zone.name}
            onDismiss={() => setBindModalVisible(false)}
            onSuccess={(count) => {
              setNotifications([
                {
                  type: "success",
                  content: `Successfully imported ${count} record(s) from BIND zone file.`,
                  dismissible: true,
                  id: "bind-success",
                  onDismiss: () => setNotifications([]),
                },
              ]);
              loadRecords();
              loadZone();
            }}
          />

          <ExportModal
            visible={exportModalVisible}
            zoneId={zone.id}
            zoneName={zone.name}
            onDismiss={() => setExportModalVisible(false)}
          />
        </>
      )}
    </SpaceBetween>
  );
}
