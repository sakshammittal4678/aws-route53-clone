"use client";

import React, { useState, useEffect } from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Alert from "@cloudscape-design/components/alert";

interface DeleteModalProps {
  visible: boolean;
  title: string;
  itemDescription: string;
  itemsList?: string[];
  warningMessage?: string;
  onDismiss: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export default function DeleteModal({
  visible,
  title,
  itemDescription,
  itemsList = [],
  warningMessage,
  onDismiss,
  onConfirm,
  loading = false,
}: DeleteModalProps) {
  const [confirmInput, setConfirmInput] = useState("");

  useEffect(() => {
    if (visible) {
      setConfirmInput("");
    }
  }, [visible]);

  const isConfirmed = confirmInput.trim().toLowerCase() === "delete";

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={title}
      closeAriaLabel="Close modal"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!isConfirmed || loading}
              loading={loading}
              onClick={onConfirm}
            >
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="warning" statusIconAriaLabel="Warning">
          {warningMessage ||
            `Permanently delete ${itemDescription}? This action cannot be undone.`}
        </Alert>

        {itemsList.length > 0 && (
          <div>
            <Box variant="awsui-key-label">Items to delete:</Box>
            <ul className="list-disc list-inside mt-1 text-sm">
              {itemsList.slice(0, 5).map((item, idx) => (
                <li key={idx} className="font-mono text-xs">{item}</li>
              ))}
              {itemsList.length > 5 && (
                <li className="text-xs text-gray-500">...and {itemsList.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        <FormField
          label={
            <span>
              To confirm deletion, type <i>delete</i> in the field below:
            </span>
          }
        >
          <Input
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.detail.value)}
            placeholder="delete"
            disabled={loading}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
