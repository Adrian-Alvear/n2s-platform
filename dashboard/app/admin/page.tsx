"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { Shield, Plus, Trash2, Check, X } from "lucide-react";

type PlatformUser = { id: string; email: string; name: string; role: "admin" | "member" | "viewer"; created_at: string };

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  member: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const PERMISSIONS: { feature: string; admin: boolean; member: boolean; viewer: boolean }[] = [
  { feature: "View Dashboard", admin: true, member: true, viewer: true },
  { feature: "View Budget", admin: true, member: true, viewer: true },
  { feature: "Add / Edit Expenses", admin: true, member: true, viewer: false },
  { feature: "Delete Expenses", admin: true, member: true, viewer: false },
  { feature: "View Chat", admin: true, member: true, viewer: false },
  { feature: "View News", admin: true, member: true, viewer: true },
  { feature: "Admin Panel", admin: true, member: false, viewer: false },
];

export default function AdminPanel() {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"member" | "viewer">("member");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await getSupabase().from("platform_users").select("*").order("created_at");
    setUsers(data ?? []);
    setLoading(false);
  }

  async function updateRole(id: string, role: string) {
    await getSupabase().from("platform_users").update({ role }).eq("id", id);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: role as PlatformUser["role"] } : u));
  }

  async function deleteUser(id: string) {
    await getSupabase().from("platform_users").delete().eq("id", id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function addUser() {
    if (!newEmail || !newName) return;
    setSaving(true);
    const { data } = await getSupabase()
      .from("platform_users")
      .insert({ email: newEmail, name: newName, role: newRole })
      .select()
      .single();
    if (data) setUsers((prev) => [...prev, data]);
    setNewEmail(""); setNewName(""); setNewRole("member");
    setSaving(false);
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
            {loading && <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>}
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 sm:px-6 py-3 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={u.role}
                    onValueChange={(v) => updateRole(u.id, v)}
                    disabled={u.email === currentUser?.email}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                  {u.email !== currentUser?.email && (
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteUser(u.id)}
                    >
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
          <CardTitle className="text-sm font-semibold">Permissions by Role</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Feature</th>
                  <th className="px-4 py-3 text-xs font-medium text-violet-600">Admin</th>
                  <th className="px-4 py-3 text-xs font-medium text-blue-600">Member</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERMISSIONS.map((p) => (
                  <tr key={p.feature} className="hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-3 font-medium text-sm">{p.feature}</td>
                    {(["admin", "member", "viewer"] as const).map((role) => (
                      <td key={role} className="px-4 py-3 text-center">
                        {p[role]
                          ? <Check size={15} className="text-emerald-500 inline" />
                          : <X size={15} className="text-muted-foreground/40 inline" />}
                      </td>
                    ))}
                  </tr>
                ))}
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
            <p className="text-xs text-muted-foreground">
              Add the user here, then invite them via Cloudflare Access to grant site access.
            </p>
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
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={addUser} disabled={!newEmail || !newName || saving}>
                {saving ? "Adding..." : "Add User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
