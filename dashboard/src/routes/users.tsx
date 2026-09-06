import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";

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
  FALLBACK,
  createUser,
  formatTime,
  getAuditTrail,
  getUsers,
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

const FALLBACK_AUDIT = [
  {
    time: "2026-06-02 09:45:20",
    user: "System",
    action: "Alert Triggered",
    details: "Unauthorized Access SEN006",
  },
  {
    time: "2026-06-02 08:20:30",
    user: "Nurse Dlamini",
    action: "Door Closed",
    details: "Medicine Cabinet A",
  },
  {
    time: "2026-06-02 08:00:00",
    user: "Dr. Ajibola",
    action: "Login",
    details: "IP: 192.168.1.105",
  },
];

function UsersPage() {
  const usersQuery = useApiQuery(getUsers, FALLBACK.users, { pollMs: 30_000 });
  const auditQuery = useApiQuery(() => getAuditTrail(100), FALLBACK_AUDIT, { pollMs: 30_000 });

  const [users, setUsers] = React.useState<AppUser[]>(FALLBACK.users);
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUsers(usersQuery.data);
  }, [usersQuery.data]);

  const addUser = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createUser(name.trim(), contact.trim() || undefined);
      setUsers((prev) => [...prev, created]);
      setName("");
      setContact("");
      setDialogOpen(false);
      usersQuery.refresh();
    } catch (e) {
      // Offline fallback: POST /api/users needs the server — keep local copy.
      if (!usersQuery.live) {
        setUsers((prev) => [
          ...prev,
          {
            name: name.trim(),
            role: "staff",
            contact: contact.trim() || "-",
            lastLogin: "Never",
            status: "Active",
          },
        ]);
        setName("");
        setContact("");
        setDialogOpen(false);
      } else {
        setError(e instanceof Error ? e.message : "Create failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          System Users{" "}
          {!usersQuery.live && !usersQuery.loading && (
            <span className="text-sm font-normal text-muted-foreground">(cached)</span>
          )}
        </h2>
        <RouterDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Add User
            </Button>
          }
          title="Add User"
          description="Create a new system user with staff access (POST /api/users defaults to staff)."
        >
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
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
                placeholder="Phone or email"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={addUser} disabled={saving || !name.trim()}>
                {saving ? "Creating…" : "Create User"}
              </Button>
            </div>
          </div>
        </RouterDialog>
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
              {users.map((user) => (
                <TableRow key={user.name}>
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
                    <Button size="icon" variant="ghost" aria-label={`Edit ${user.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                {auditQuery.data.map((entry) => (
                  <TableRow key={`${entry.time}-${entry.action}-${entry.details}`}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatTime(entry.time)}
                    </TableCell>
                    <TableCell>{entry.user}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>{entry.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
