"use client";

import { useState } from "react";
import {
  inviteStaffMember,
  resendStaffSetupEmail,
  sendStaffPasswordReset,
  updateStaffAccess,
} from "@/app/admin/users/actions";
import { HubSubmitButton } from "@/components/hub/hub-form-fields";
import {
  STAFF_ASSIGNABLE_ROLE_PRESETS,
  type StaffAssignableRole,
} from "@/lib/hub/staff-presets";
import type { HubStaffMember } from "@/lib/hub/staff-directory";

function RoleCheckboxes({
  namePrefix,
  selected,
  onChange,
  disabled,
}: {
  namePrefix?: string;
  selected: StaffAssignableRole[];
  onChange?: (next: StaffAssignableRole[]) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {STAFF_ASSIGNABLE_ROLE_PRESETS.map((preset) => {
        const checked = selected.includes(preset.role);
        return (
          <li key={preset.role}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 py-3">
              <input
                type="checkbox"
                name={namePrefix ? undefined : "roles"}
                value={preset.role}
                checked={checked}
                disabled={disabled}
                onChange={
                  onChange
                    ? (event) => {
                        if (event.target.checked) {
                          onChange([...selected, preset.role]);
                        } else {
                          onChange(selected.filter((role) => role !== preset.role));
                        }
                      }
                    : undefined
                }
                className="mt-1"
              />
              <span>
                <span className="block text-base font-semibold">
                  {preset.checkboxLabel}
                </span>
                <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                  {preset.title}. {preset.description}
                </span>
              </span>
            </label>
            {namePrefix && checked ? (
              <input type="hidden" name="roles" value={preset.role} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function InviteStaffForm() {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<StaffAssignableRole[]>([]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
        data-testid="invite-staff-open"
      >
        Invite Staff Member
      </button>
    );
  }

  return (
    <form
      action={inviteStaffMember}
      className="space-y-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5"
      data-testid="invite-staff-form"
    >
      <div>
        <h2 className="text-lg font-semibold">Invite Staff Member</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          They receive an email to choose a password and set up MFA before using
          the Hub.
        </p>
      </div>
      <div>
        <label htmlFor="invite-email" className="block text-base font-medium">
          Email address
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 text-base"
        />
      </div>
      <div>
        <label
          htmlFor="invite-display-name"
          className="block text-base font-medium"
        >
          Display name (optional)
        </label>
        <input
          id="invite-display-name"
          name="display_name"
          type="text"
          className="mt-2 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 text-base"
        />
      </div>
      <fieldset>
        <legend className="text-base font-medium">Access</legend>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Choose one or more. Super Admin is not available here.
        </p>
        <div className="mt-3">
          <RoleCheckboxes selected={roles} onChange={setRoles} namePrefix="invite" />
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <HubSubmitButton>Send invitation</HubSubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center px-4 text-base font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function StaffMemberCard({
  member,
  currentUserId,
  initiallyOpen,
}: {
  member: HubStaffMember;
  currentUserId: string;
  initiallyOpen?: boolean;
}) {
  const [editing, setEditing] = useState(Boolean(initiallyOpen));
  const [roles, setRoles] = useState<StaffAssignableRole[]>(
    member.assignableRoles,
  );
  const isSelf = member.id === currentUserId;

  return (
    <article
      id={`staff-${member.id}`}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5"
      data-testid="staff-member-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-body)]">
            {member.displayName?.trim() || member.email || "Staff member"}
          </h3>
          {member.email ? (
            <p className="mt-1 text-base text-[var(--color-text-muted)]">
              {member.email}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-medium text-[var(--color-text-body)]">
            {member.roleLabels.join(" · ") || "No Hub access"}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {member.accountStatusLabel} · {member.mfaStatusLabel}
          </p>
        </div>
        {!member.isSuperAdmin ? (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-base font-semibold"
          >
            {editing ? "Close" : "Update access"}
          </button>
        ) : (
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            Super Admin (managed separately)
          </p>
        )}
      </div>

      {member.accountStatus === "invitation_pending" ? (
        <div className="mt-5 space-y-3 border-t border-[var(--color-border)] pt-5">
          <p className="text-base font-medium text-[var(--color-text-body)]">
            Invitation pending
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Send the setup email again so they can choose a password and finish
            MFA.
          </p>
          <form action={resendStaffSetupEmail}>
            <input type="hidden" name="user_id" value={member.id} />
            <HubSubmitButton variant="secondary">
              Resend setup email
            </HubSubmitButton>
          </form>
        </div>
      ) : null}

      {member.accountStatus === "active" ? (
        <div className="mt-5 space-y-3 border-t border-[var(--color-border)] pt-5">
          <p className="text-base font-medium text-[var(--color-text-body)]">
            Password & sign-in
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            They receive an email and choose their own new password. MFA stays
            required.
          </p>
          <form action={sendStaffPasswordReset}>
            <input type="hidden" name="user_id" value={member.id} />
            <HubSubmitButton variant="quiet">Send password reset</HubSubmitButton>
          </form>
        </div>
      ) : null}

      {editing && !member.isSuperAdmin ? (
        <form action={updateStaffAccess} className="mt-5 space-y-4 border-t border-[var(--color-border)] pt-5">
          <input type="hidden" name="user_id" value={member.id} />
          <fieldset>
            <legend className="text-base font-medium">Access</legend>
            <div className="mt-3">
              <RoleCheckboxes
                selected={roles}
                onChange={setRoles}
                namePrefix="edit"
              />
            </div>
          </fieldset>
          {roles.length === 0 ? (
            <label className="flex items-start gap-3 text-sm text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                name="confirm_remove_access"
                value="yes"
                className="mt-1"
                disabled={isSelf}
              />
              <span>
                I understand this removes Hub access. Their account is kept for
                history; they will not be able to use the Hub.
                {isSelf ? " You cannot disable your own access here." : null}
              </span>
            </label>
          ) : null}
          <HubSubmitButton>Save access</HubSubmitButton>
        </form>
      ) : null}
    </article>
  );
}
