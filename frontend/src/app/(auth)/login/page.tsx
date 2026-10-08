"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Alert from "@cloudscape-design/components/alert";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"iam" | "root">("iam");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your account identifier and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (type: "admin" | "paul") => {
    if (type === "admin") {
      setIdentifier("admin");
      setPassword("password123");
    } else {
      setIdentifier("paul-philip");
      setPassword("password123");
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0f1b2a] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* AWS Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <svg
              className="w-12 h-8 text-[#FF9900]"
              viewBox="0 0 40 24"
              fill="currentColor"
            >
              <path d="M20.2 16.4c-4.3 0-8.1 1.6-11.2 4.2-.4.3-.2.8.2.8 1.4 0 2.8-.2 4.1-.6 2.1-.6 4.4-.9 6.9-.9 2.5 0 4.8.3 6.9.9 1.3.4 2.7.6 4.1.6.4 0 .6-.5.2-.8-3.1-2.6-6.9-4.2-11.2-4.2z" />
              <path
                fill="white"
                d="M10.5 13.8l-1.3-4.3c-.3-.9-.6-2.3-.8-3.2h-.1c-.2.9-.5 2.3-.8 3.2L6.2 13.8h4.3zm-5.7 3.3l3.6-11.9h2.9l3.6 11.9h-2.3l-.8-2.8H7.3l-.8 2.8H4.8zm12.5 0l2.7-11.9h2.3l1.8 7.6c.3 1.3.6 2.8.8 3.8h.1c.2-1 .5-2.5.8-3.8l1.8-7.6h2.2l2.7 11.9h-2.2l-1.4-6.9c-.3-1.4-.5-2.8-.7-3.9h-.1c-.2 1.1-.5 2.5-.8 3.9l-1.5 6.9h-2l-1.5-6.9c-.3-1.4-.6-2.8-.8-3.9h-.1c-.2 1.1-.4 2.5-.7 3.9l-1.4 6.9h-2.2z"
              />
            </svg>
            <span className="text-2xl font-bold text-white tracking-wide">
              AWS Management Console
            </span>
          </div>
          <p className="text-sm text-gray-400">Sign in to your AWS account</p>
        </div>

        {/* Card */}
        <Container
          header={
            <Header variant="h2" description="Select your identity type to sign in">
              Sign In
            </Header>
          }
        >
          <form onSubmit={handleSubmit}>
            <SpaceBetween size="m">
              {error && <Alert type="error">{error}</Alert>}

              {/* IAM vs Root toggle */}
              <div className="flex border-b border-gray-700 pb-3 gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                  <input
                    type="radio"
                    name="userType"
                    checked={userType === "iam"}
                    onChange={() => setUserType("iam")}
                    className="accent-[#ec7211]"
                  />
                  <span>IAM user</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                  <input
                    type="radio"
                    name="userType"
                    checked={userType === "root"}
                    onChange={() => setUserType("root")}
                    className="accent-[#ec7211]"
                  />
                  <span>Root user (Email)</span>
                </label>
              </div>

              <FormField
                label={
                  userType === "iam"
                    ? "IAM username or account email"
                    : "Root account email address"
                }
                description={
                  userType === "iam"
                    ? "Enter your IAM username (e.g. admin or paul-philip)"
                    : "Enter your registered email address"
                }
              >
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.detail.value)}
                  placeholder={userType === "iam" ? "admin" : "admin@example.com"}
                  autoFocus
                />
              </FormField>

              <FormField label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.detail.value)}
                  placeholder="Enter your password"
                />
              </FormField>

              <div className="pt-2">
                <Button
                  variant="primary"
                  loading={loading}
                  fullWidth
                  onClick={() => handleSubmit()}
                >
                  Sign In
                </Button>
              </div>

              {/* Quick credentials filler for evaluators */}
              <div className="mt-4 pt-4 border-t border-gray-700/60">
                <p className="text-xs text-gray-400 mb-2 font-semibold">
                  DEMO CREDENTIALS:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillDemo("admin")}
                    className="text-xs px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-yellow-300 rounded border border-gray-600"
                  >
                    Use Admin (admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillDemo("paul")}
                    className="text-xs px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-yellow-300 rounded border border-gray-600"
                  >
                    Use Paul Philip (paul-philip)
                  </button>
                </div>
              </div>
            </SpaceBetween>
          </form>
        </Container>

        <div className="text-center mt-6 text-xs text-gray-500">
          © 2026, Amazon Web Services, Inc. or its affiliates. All rights reserved.
        </div>
      </div>
    </div>
  );
}
