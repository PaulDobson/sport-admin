import type { Tenant } from "@/domain/tenants/tenant";
import type {
  TenantMembership,
  TenantMembershipRole,
} from "@/domain/tenants/tenant-membership";
import type {
  AuditLogEntry,
  AuditLogPort,
} from "@/application/shared/audit/audit-log-port";
import type { AuthPort } from "../ports/auth-port";
import type { TenantMembershipRepositoryPort } from "../ports/tenant-membership-repository-port";
import type { TenantRepositoryPort } from "../ports/tenant-repository-port";

/** In-memory test doubles for the auth module's ports. For unit tests only, never used in production. */

export class FakeTenantRepository implements TenantRepositoryPort {
  private readonly tenants = new Map<string, Tenant>();
  private nextId = 1;

  async create(input: { name: string; createdBy: string }): Promise<Tenant> {
    const tenant: Tenant = {
      id: `tenant-${this.nextId++}`,
      name: input.name,
      status: "trial",
      createdBy: input.createdBy,
      createdAt: new Date(),
    };
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.get(id) ?? null;
  }

  async findOperationalByUser(): Promise<Tenant[]> {
    return [...this.tenants.values()].filter(
      (tenant) => tenant.status === "trial" || tenant.status === "active",
    );
  }
}

export class FakeTenantMembershipRepository implements TenantMembershipRepositoryPort {
  private readonly memberships: TenantMembership[] = [];
  private nextId = 1;

  async create(input: {
    tenantId: string;
    userId: string;
    role: TenantMembershipRole;
  }): Promise<TenantMembership> {
    const membership: TenantMembership = {
      id: `membership-${this.nextId++}`,
      tenantId: input.tenantId,
      userId: input.userId,
      role: input.role,
      status: "active",
      createdAt: new Date(),
    };
    this.memberships.push(membership);
    return membership;
  }

  async findActiveByUser(userId: string): Promise<TenantMembership[]> {
    return this.memberships.filter(
      (membership) =>
        membership.userId === userId && membership.status === "active",
    );
  }

  async findOperationalByUser(userId: string): Promise<TenantMembership[]> {
    return this.findActiveByUser(userId);
  }
}

export class FakeAuditLog implements AuditLogPort {
  readonly entries: AuditLogEntry[] = [];

  async record(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}

export class FakeAuthPort implements AuthPort {
  signUpCalls: { email: string; password: string; fullName: string }[] = [];
  signInCalls: { email: string; password: string }[] = [];
  passwordResetCalls: string[] = [];
  passwordUpdateCalls: string[] = [];
  currentUserId: string | null = null;

  async signUp(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ userId: string }> {
    this.signUpCalls.push(input);
    return { userId: "user-1" };
  }

  async signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<{ userId: string }> {
    this.signInCalls.push(input);
    return { userId: "user-1" };
  }

  async requestPasswordReset(email: string): Promise<void> {
    this.passwordResetCalls.push(email);
  }

  async updatePassword(password: string): Promise<void> {
    this.passwordUpdateCalls.push(password);
  }

  async signOut(): Promise<void> {
    this.currentUserId = null;
  }

  async getCurrentUserId(): Promise<string | null> {
    return this.currentUserId;
  }
}
