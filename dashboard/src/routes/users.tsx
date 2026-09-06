import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouterDialog } from "@/components/ui/router-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createUser,
  deleteUser,
  formatTime,
  getAuditTrail,
  getStoredUser,
  getUsers,
  updateUser,
  useApiQuery,
  type AppUser,
  type Role,
} from "@/lib/api";

export const Route = createFileRoute("/users")({ component: UsersPage });

function roleVariant(role: Role) {
  if (role === "admin") return "critical" as const;
  if (role === "supervisor") return "warning" as const;
  return "secondary" as const;
}

function UsersPage() {
  const usersQuery = useApiQuery(getUsers, [], { pollMs: 30_000 });
  const auditQuery = useApiQuery(() => getAuditTrail(100), [], { pollMs: 30_000 });

  const currentRole = getStoredUser()?.role;
  const isAdmin = currentRole === "admin";
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [newRole, setNewRole] = React.useState<Role>("staff");
  const [newPassword, setNewPassword] = React.useState("");
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<AppUser | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editContact, setEditContact] = React.useState("");
  const [editRole, setEditRole] = React.useState<Role>("staff");
  const [editStatus, setEditStatus] = React.useState<AppUser["status"]>("Active");
  const [editPassword, setEditPassword] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<AppUser | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  React.useEffect(() => {
    setUsers(usersQuery.data);
  }, [usersQuery.data]);

  const addUser = async () => {
    if (!name.trim()) return;
    if (newPassword !== "" && newPassword.length < 8) {
      setError("Password must be at least 8 characters (or leave blank to generate one).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createUser({
        name: name.trim(),
        contact: contact.trim() || undefined,
        role: newRole,
        password: newPassword || undefined,
      });
      setUsers((prev) => [...prev, created]);
      setName("");
      setContact("");
      setNewRole("staff");
      setNewPassword("");
      setTempPassword(created.temporaryPassword ?? null);
      if (!created.temporaryPassword) setDialogOpen(false);
      usersQuery.refresh();
    } catch (e) {
      // No offline fake users: creation requires the backend.
      setError(
        !usersQuery.live
          ? "Cannot create users while the backend is unreachable."
          : e instanceof Error
            ? e.message
            : "Create failed",
      );
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user: AppUser) => {
    setEditing(user);
    setEditName(user.name);
    setEditContact(user.contact === "-" ? "" : user.contact);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditPassword("");
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing || !editName.trim()) return;
    if (editPassword !== "" && editPassword.length < 8) {
      setEditError("Password must be at least 8 characters (or leave blank to keep it).");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateUser(editing.id, {
        name: editName.trim(),
        role: editRole,
        contact: editContact.trim() || undefined,
        status: editStatus,
        password: editPassword || undefined,
      });
      setEditing(null);
      usersQuery.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setError(null);
    try {
      await deleteUser(deleting.id);
      setDeleting(null);
      usersQuery.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          System Users{" "}
          {!usersQuery.live && !usersQuery.loading && (
            <span className="text-sm font-normal text-muted-foreground">(offline)</span>
          )}
        </h2>
        {isAdmin ? (
          <RouterDialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) setTempPassword(null);
            }}
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Add User
              </Button>
            }
            title="Add User"
            description="Create a system user (admin only). They sign in with their contact or name + password."
          >
            <div className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {tempPassword && (
                <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  Temporary password (copy now — it won&apos;t be shown again):{" "}
                  <span className="font-mono font-bold">{tempPassword}</span>
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="user-name">Name</Label>
                <Input
                  id="user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nurse Khumalo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-contact">Contact</Label>
                <Input
                  id="user-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Phone or email (used to sign in)"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-password">Password</Label>
                  <Input
                    id="user-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Blank → generate"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {tempPassword && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setTempPassword(null);
                    }}
                  >
                    Done
                  </Button>
                )}
                <Button onClick={addUser} disabled={saving || !name.trim()}>
                  {saving ? "Creating…" : "Create User"}
                </Button>
              </div>
            </div>
          </RouterDialog>
        ) : (
          <p className="text-sm text-muted-foreground">Only admins can add users.</p>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No users yet — add the first user above.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold">{user.name}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant(user.role)}>
                        {user.role === "admin"
                          ? "Admin"
                          : user.role === "supervisor"
                            ? "Supervisor"
                            : "Staff"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.contact}</TableCell>
                    <TableCell className="tabular-nums">{formatTime(user.lastLogin)}</TableCell>
                    <TableCell>
                      <Badge variant="success">{user.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${user.name}`}
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete ${user.name}`}
                            onClick={() => setDeleting(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Admin only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RouterDialog
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        trigger={<span className="hidden" />}
        title={editing ? `Edit ${editing.name}` : "Edit user"}
        description="Update the user's details (PATCH /api/users/:id)."
      >
        <div className="space-y-4">
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Name</Label>
            <Input
              id="edit-user-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as AppUser["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-contact">Contact</Label>
            <Input
              id="edit-user-contact"
              value={editContact}
              onChange={(e) => setEditContact(e.target.value)}
              placeholder="Phone or email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-password">Reset password</Label>
            <Input
              id="edit-user-password"
              type="password"
              autoComplete="new-password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Leave blank to keep current"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveEdit} disabled={editSaving || !editName.trim()}>
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </RouterDialog>

      <RouterDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        trigger={<span className="hidden" />}
        title={deleting ? `Delete ${deleting.name}?` : "Delete user?"}
        description="This removes the user permanently. Their audit entries are kept."
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
            {deleteBusy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </RouterDialog>

      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Audit Trail{" "}
          <span className="text-sm font-normal text-muted-foreground">
            (GET /api/audit-trail?limit=100, newest first)
          </span>
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.loading && auditQuery.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Loading audit trail…
                    </TableCell>
                  </TableRow>
                ) : auditQuery.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No audit entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditQuery.data.map((entry) => (
                    <TableRow key={`${entry.time}-${entry.action}-${entry.details}`}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatTime(entry.time)}
                      </TableCell>
                      <TableCell>{entry.user}</TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>{entry.details}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
