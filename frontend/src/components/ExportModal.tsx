"use client";

import React, { useState } from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import RadioGroup from "@cloudscape-design/components/radio-group";
import FormField from "@cloudscape-design/components/form-field";

interface ExportModalProps {
  visible: boolean;
  zoneId: string;
  zoneName: string;
  onDismiss: () => void;
}

export default function ExportModal({
  visible,
  zoneId,
  zoneName,
  onDismiss,
}: ExportModalProps) {
  const [format, setFormat] = useState<"bind" | "json">("bind");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    const downloadUrl = `/api/v1/hosted-zones/${zoneId}/export?format=${format}`;

    // Create invisible anchor and download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `${zoneName.replace(/\.$/, "")}.${format === "bind" ? "zone" : "json"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      onDismiss();
    }, 500);
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={`Export hosted zone: ${zoneName}`}
      closeAriaLabel="Close modal"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss} disabled={downloading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={downloading}
              onClick={handleDownload}
            >
              Export
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <FormField label="Export format" description="Choose standard BIND format or JSON structure.">
          <RadioGroup
            value={format}
            onChange={(e) => setFormat(e.detail.value as "bind" | "json")}
            items={[
              {
                value: "bind",
                label: "RFC 1035 BIND Zone File (.zone)",
                description: "Standard zone file compatible with BIND, named, and DNS migrators",
              },
              {
                value: "json",
                label: "JSON Document (.json)",
                description: "Machine-readable structured format containing zone metadata and records",
              },
            ]}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
