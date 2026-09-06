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
import { USERS, type AppUser, type Role } from "@/data/clinic";

export const Route = createFileRoute("/users")({ component: UsersPage });

function roleVariant(role: Role) {
  if (role === "admin") return "critical" as const;
  if (role === "supervisor") return "warning" as const;
  return "secondary" as const;
}

function UsersPage() {
  const [users, setUsers] = React.useState<AppUser[]>(USERS);
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const addUser = () => {
    if (!name.trim()) return;
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Users</h2>
        <RouterDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Add User
            </Button>
          }
          title="Add User"
          description="Create a new system user with staff access."
        >
          <div className="space-y-4">
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
              <Button onClick={addUser}>Create User</Button>
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
                  <TableCell>{user.lastLogin}</TableCell>
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
        <h2 className="mb-4 text-lg font-semibold">Audit Trail</h2>
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
                {[
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
                ].map((entry) => (
                  <TableRow key={`${entry.time}-${entry.action}`}>
                    <TableCell>{entry.time}</TableCell>
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
