"use client";

import React, { useState } from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Textarea from "@cloudscape-design/components/textarea";
import Alert from "@cloudscape-design/components/alert";
import { fetchApi } from "@/lib/api";
import { BindImportResponse } from "@/lib/types";

interface BindImportModalProps {
  visible: boolean;
  zoneId: string;
  zoneName: string;
  onDismiss: () => void;
  onSuccess: (count: number) => void;
}

export default function BindImportModal({
  visible,
  zoneId,
  zoneName,
  onDismiss,
  onSuccess,
}: BindImportModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const samplePlaceholder = `; BIND zone file format sample
$ORIGIN ${zoneName}
$TTL 300
www     IN  A       192.0.2.1
mail    IN  MX  10  mail.${zoneName}
api     IN  CNAME   www.${zoneName}
`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent((event.target?.result as string) || "");
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!content.trim()) {
      setError("Please paste or upload BIND zone content.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi<BindImportResponse>(
        `/hosted-zones/${zoneId}/import-bind`,
        {
          method: "POST",
          body: JSON.stringify({ zone_content: content }),
        }
      );
      onSuccess(res.imported_count);
      onDismiss();
    } catch (err: any) {
      setError(err.message || "Failed to import BIND zone file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={`Import DNS records from BIND zone file into ${zoneName}`}
      closeAriaLabel="Close modal"
      size="medium"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={loading}
              disabled={!content.trim() || loading}
              onClick={handleImport}
            >
              Import records
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="info">
          Paste standard RFC 1035 zone file content or choose a file from your computer. Existing non-apex records with identical names and types will be updated; new records will be added. Apex NS/SOA records will be preserved.
        </Alert>

        {error && <Alert type="error">{error}</Alert>}

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
            Choose .zone or .txt file
          </label>
          <input
            type="file"
            accept=".zone,.txt,.bind"
            onChange={handleFileUpload}
            className="text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <FormField
          label="BIND zone file content"
          description="Edit or paste your raw RFC 1035 zone file records directly."
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.detail.value)}
            rows={10}
            placeholder={samplePlaceholder}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
