export interface User {
  id: number;
  username: string;
  email: string;
  account_id: string;
  created_at: string;
}

export interface HostedZone {
  id: string;
  name: string;
  description?: string | null;
  type: "Public" | "Private";
  created_by: string;
  vpc_id?: string | null;
  vpc_region?: string | null;
  record_count: number;
  caller_reference: string;
  created_at: string;
  updated_at: string;
}

export type RoutingPolicyType = "Simple" | "Weighted";

export type RecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "TXT"
  | "MX"
  | "NS"
  | "PTR"
  | "SRV"
  | "CAA"
  | "SOA";

export interface DNSRecord {
  id: string;
  zone_id: string;
  name: string;
  type: RecordType;
  routing_policy: RoutingPolicyType;
  set_identifier: string;
  weight?: number | null;
  ttl: number;
  records: string[];
  is_alias: boolean;
  alias_target?: string | null;
  evaluate_target_health: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkDeleteResponse {
  deleted_count: number;
  deleted_ids: string[];
  skipped_ids: string[];
  message: string;
}

export interface BindImportResponse {
  imported_count: number;
  records: DNSRecord[];
  message: string;
}
