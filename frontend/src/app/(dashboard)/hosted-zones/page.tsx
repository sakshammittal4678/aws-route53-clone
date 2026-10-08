"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Table from "@cloudscape-design/components/table";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Pagination from "@cloudscape-design/components/pagination";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";
import Link from "next/link";

import { HostedZone } from "@/lib/types";
import { fetchApi } from "@/lib/api";
import DeleteModal from "@/components/DeleteModal";

export default function HostedZonesPage() {
  const router = useRouter();
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<HostedZone[]>([]);
  
  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<{ label: string; value: string }>({
    label: "All types",
    value: "All",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Sorting
  const [sortingColumn, setSortingColumn] = useState<any>({
    sortingField: "name",
  });
  const [isDescending, setIsDescending] = useState(false);

  // Modals & Notifications
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notifications, setNotifications] = useState<FlashbarProps.MessageDefinition[]>([]);

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: pageSize.toString(),
        sort_by: sortingColumn.sortingField || "name",
        order: isDescending ? "desc" : "asc",
      });

      if (searchQuery.trim()) {
        params.set("query", searchQuery.trim());
      }
      if (typeFilter.value && typeFilter.value !== "All") {
        params.set("type", typeFilter.value);
      }

      const res = await fetchApi<{ items: HostedZone[]; total: number }>(
        `/hosted-zones?${params.toString()}`
      );
      setZones(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setNotifications([
        {
          type: "error",
          content: err.message || "Failed to load hosted zones",
          dismissible: true,
          id: "err-load",
          onDismiss: () => setNotifications([]),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, typeFilter, sortingColumn, isDescending]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const handleDeleteConfirm = async () => {
    if (selectedItems.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const zone of selectedItems) {
        await fetchApi(`/hosted-zones/${zone.id}`, { method: "DELETE" });
      }
      setNotifications([
        {
          type: "success",
          content: `Successfully deleted ${selectedItems.length} hosted zone(s).`,
          dismissible: true,
          id: "del-success",
          onDismiss: () => setNotifications([]),
        },
      ]);
      setSelectedItems([]);
      setDeleteModalVisible(false);
      loadZones();
    } catch (err: any) {
      setNotifications([
        {
          type: "error",
          content: err.message || "Failed to delete hosted zone(s).",
          dismissible: true,
          id: "del-err",
          onDismiss: () => setNotifications([]),
        },
      ]);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Route 53", href: "/hosted-zones" },
          { text: "Hosted zones", href: "/hosted-zones" },
        ]}
        ariaLabel="Breadcrumbs"
      />

      {notifications.length > 0 && <Flashbar items={notifications} />}

      <Table
        columnDefinitions={[
          {
            id: "name",
            header: "Hosted zone name",
            cell: (item) => (
              <Link
                href={`/hosted-zones/${item.id}`}
                className="text-[#0972d3] hover:underline font-semibold"
              >
                {item.name}
              </Link>
            ),
            sortingField: "name",
          },
          {
            id: "type",
            header: "Type",
            cell: (item) => item.type,
            sortingField: "type",
          },
          {
            id: "created_by",
            header: "Created by",
            cell: (item) => item.created_by,
            sortingField: "created_by",
          },
          {
            id: "record_count",
            header: "Record count",
            cell: (item) => item.record_count,
            sortingField: "record_count",
          },
          {
            id: "description",
            header: "Description",
            cell: (item) => item.description || "-",
          },
          {
            id: "id",
            header: "Hosted zone ID",
            cell: (item) => (
              <span className="font-mono text-xs">{item.id}</span>
            ),
            sortingField: "id",
          },
        ]}
        items={zones}
        loading={loading}
        loadingText="Loading hosted zones..."
        selectionType="multi"
        selectedItems={selectedItems}
        onSelectionChange={(e) => setSelectedItems(e.detail.selectedItems)}
        sortingColumn={sortingColumn}
        sortingDescending={isDescending}
        onSortingChange={(e) => {
          setSortingColumn(e.detail.sortingColumn);
          setIsDescending(e.detail.isDescending || false);
        }}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${total})`}
            description="Automatic mode is the current search behavior optimized for best filter results. To change modes go to settings."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  iconName="refresh"
                  ariaLabel="Refresh"
                  onClick={loadZones}
                  loading={loading}
                />
                <Button
                  disabled={selectedItems.length !== 1}
                  onClick={() =>
                    selectedItems[0] &&
                    router.push(`/hosted-zones/${selectedItems[0].id}`)
                  }
                >
                  View details
                </Button>
                <Button
                  disabled={selectedItems.length === 0}
                  onClick={() => setDeleteModalVisible(true)}
                >
                  Delete
                </Button>
                <Button
                  variant="primary"
                  onClick={() => router.push("/hosted-zones/create")}
                >
                  Create hosted zone
                </Button>
              </SpaceBetween>
            }
          >
            Hosted zones
          </Header>
        }
        filter={
          <div className="flex gap-4 items-center mb-3">
            <div className="flex-1">
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.detail.value)}
                placeholder="Filter records by property or value"
                clearAriaLabel="Clear search"
              />
            </div>
            <div className="w-48">
              <Select
                selectedOption={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.detail.selectedOption as any)
                }
                options={[
                  { label: "All types", value: "All" },
                  { label: "Public hosted zone", value: "Public" },
                  { label: "Private hosted zone", value: "Private" },
                ]}
              />
            </div>
          </div>
        }
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={Math.max(1, Math.ceil(total / pageSize))}
            onChange={(e) => setCurrentPage(e.detail.currentPageIndex)}
          />
        }
        empty={
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <SpaceBetween size="m">
              <b>No hosted zones</b>
              <Box variant="p" color="text-status-inactive">
                There are no hosted zones created for this account.
              </Box>
              <Button
                variant="primary"
                onClick={() => router.push("/hosted-zones/create")}
              >
                Create hosted zone
              </Button>
            </SpaceBetween>
          </Box>
        }
      />

      <DeleteModal
        visible={deleteModalVisible}
        title={`Delete hosted zone${selectedItems.length > 1 ? "s" : ""}`}
        itemDescription={`${selectedItems.length} hosted zone(s)`}
        itemsList={selectedItems.map((z) => `${z.name} (${z.id})`)}
        warningMessage="Permanently delete the selected hosted zone(s) and all of their DNS records? This action cannot be undone."
        onDismiss={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </SpaceBetween>
  );
}
