"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { getSupabase } from "@/lib/supabase";
import { mutate } from "@/lib/db";
import { useUser } from "@/lib/user-context";
import { Shield, Plus, Trash2, Pencil, Check, Loader2 } from "lucide-react";

type PlatformUser = { id: string; email: string; name: string; role: "admin" | "member" | "viewer"; created_at: string };
type Permission = { feature: string; role: "member" | "viewer"; allowed: boolean };

const FEATURES = [
  "Access Portal",
  "View Budget",
  "Add / Edit Expenses",
  "Delete Expenses",
  "View Chat",
  "View News",
] as const;

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  member: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function isAllowed(permissions: Permission[], feature: string, role: "member" | "viewer") {
  return permissions.find((p) => p.feature === feature && p.role === role)?.allowed ?? false;
}

export default function AdminPanel() {
  const { user: currentUser } = useUser();

  // Users state
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permsLoading, setPermsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add user dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"member" | "viewer">("member");
  const [addSaving, setAddSaving] = useState(false);

  // Edit user dialog
  const [editUser, setEditUser] = useState<PlatformUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<PlatformUser["role"]>("member");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);

  async function fetchUsers() {
    setUsersLoading(true);
    const { data } = await getSupabase().from("platform_users").select("*").order("created_at");
    setUsers(data ?? []);
    setUsersLoading(false);
  }

  async function fetchPermissions() {
    setPermsLoading(true);
    const { data } = await getSupabase().from("role_permissions").select("feature, role, allowed");
    setPermissions(data ?? []);
    setPermsLoading(false);
  }

  async function togglePermission(feature: string, role: "member" | "viewer", current: boolean) {
    const next = !current;
    setPermissions((prev) =>
      prev.map((p) => p.feature === feature && p.role === role ? { ...p, allowed: next } : p)
    );
    const err = await mutate(
      getSupabase()
        .from("role_permissions")
        .update({ allowed: next })
        .eq("feature", feature)
        .eq("role", role)
    );
    // The toggle was flipped optimistically — put it back if the write failed,
    // otherwise the UI claims a permission that was never actually granted.
    if (err) {
      setPermissions((prev) =>
        prev.map((p) => p.feature === feature && p.role === role ? { ...p, allowed: !next } : p)
      );
      setError("Could not update that permission. Try again.");
    }
  }

  function openEdit(u: PlatformUser) {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
  }

  async function saveEdit() {
    if (!editUser) return;
    setError(null);
    setEditSaving(true);
    const err = await mutate(
      getSupabase()
        .from("platform_users")
        .update({ name: editName, email: editEmail, role: editRole })
        .eq("id", editUser.id)
    );
    if (err) { setEditSaving(false); setError("Could not save those changes. Try again."); return; }
    setUsers((prev) =>
      prev.map((u) => u.id === editUser.id ? { ...u, name: editName, email: editEmail, role: editRole } : u)
    );
    setEditSaving(false);
    setEditUser(null);
  }

  async function deleteUser(id: string) {
    setError(null);
    const err = await mutate(getSupabase().from("platform_users").delete().eq("id", id));
    // Only remove the row locally once the delete actually landed.
    if (err) { setError("Could not delete that user."); return; }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function addUser() {
    if (!newEmail || !newName) return;
    setAddSaving(true);
    setError(null);
    const { data, error: addError } = await getSupabase()
      .from("platform_users")
      .insert({ email: newEmail, name: newName, role: newRole })
      .select()
      .single();
    if (addError || !data) {
      console.error("[admin] add user failed:", addError?.message);
      setAddSaving(false);
      setError("Could not add that user. Try again.");
      return;
    }
    setUsers((prev) => [...prev, data]);
    setNewEmail(""); setNewName(""); setNewRole("member");
    setAddSaving(false);
    setAddOpen(false);
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
          <Shield size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
          )}
          <p className="text-muted-foreground text-sm">Manage users and permissions</p>
        </div>
      </div>

      {/* Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Users & Roles</CardTitle>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white h-8" onClick={() => setAddOpen(true)}>
            <Plus size={13} /> Add User
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {usersLoading && <div className="py-8 text-center text-muted-foreground text-sm"><Loader2 className="animate-spin inline mr-2" size={14} />Loading...</div>}
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 sm:px-6 py-3 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(u)}>
                    <Pencil size={13} />
                  </Button>
                  {u.email !== currentUser?.email && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteUser(u.id)}>
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions matrix */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">Permissions by Role</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Admin always has full access. Toggle Member and Viewer permissions below.</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-muted-foreground">Feature</th>
                  <th className="px-4 py-3 text-xs font-medium text-violet-600 text-center">Admin</th>
                  <th className="px-4 py-3 text-xs font-medium text-blue-600 text-center">Member</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {permsLoading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm"><Loader2 className="animate-spin inline mr-2" size={14} />Loading...</td></tr>
                ) : (
                  FEATURES.map((feature) => (
                    <tr key={feature} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 sm:px-6 py-3 font-medium text-sm">{feature}</td>
                      <td className="px-4 py-3 text-center">
                        <Check size={15} className="text-emerald-500 inline" />
                      </td>
                      {(["member", "viewer"] as const).map((role) => (
                        <td key={role} className="px-4 py-3 text-center">
                          <Switch
                            checked={isAllowed(permissions, feature, role)}
                            onCheckedChange={() => togglePermission(feature, role, isAllowed(permissions, feature, role))}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground">Add the user here, then invite them via Cloudflare Access to grant site access.</p>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Javi" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input placeholder="javi@example.com" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "member" | "viewer")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member — can add/edit expenses</SelectItem>
                  <SelectItem value="viewer">Viewer — read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={addUser} disabled={!newEmail || !newName || addSaving}>
                {addSaving ? "Adding..." : "Add User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as PlatformUser["role"])} disabled={editUser?.email === currentUser?.email}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              {editUser?.email === currentUser?.email && (
                <p className="text-xs text-muted-foreground">You can&apos;t change your own role.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={saveEdit} disabled={!editName || !editEmail || editSaving}>
                {editSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
