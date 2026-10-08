"use client";

import React from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";

interface ShortcutsHelpModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ShortcutsHelpModal({
  visible,
  onDismiss,
}: ShortcutsHelpModalProps) {
  const shortcuts = [
    { key: "?", description: "Open / close this keyboard shortcuts guide" },
    { key: "Option + S / Alt + S", description: "Focus global console search input" },
    { key: "c", description: "Trigger 'Create hosted zone' or 'Create record' on list pages" },
    { key: "Esc", description: "Dismiss open modals, panels, and drawers" },
  ];

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header="AWS Route 53 Console Keyboard Shortcuts"
      closeAriaLabel="Close modal"
      footer={
        <Box float="right">
          <Button variant="primary" onClick={onDismiss}>
            Close
          </Button>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <p className="text-sm text-gray-400">
          Navigate and perform key actions across the Route 53 console quickly using the following keyboard shortcuts:
        </p>
        <div className="border border-gray-700 rounded overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f2937] text-gray-300">
              <tr>
                <th className="p-2 border-b border-gray-700">Shortcut Key</th>
                <th className="p-2 border-b border-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((sc, i) => (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-[#2d3748]">
                  <td className="p-2">
                    <kbd className="px-2 py-1 bg-gray-800 text-yellow-400 font-mono text-xs rounded border border-gray-600">
                      {sc.key}
                    </kbd>
                  </td>
                  <td className="p-2 text-gray-300">{sc.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SpaceBetween>
    </Modal>
  );
}
