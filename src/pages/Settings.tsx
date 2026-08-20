"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { supabase } from "@/integrations/supabase/client"
import { setNotesKey, NOTES_KEY_PATTERN } from "@/lib/notesGate"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState({
    all: false,
    system: true,
    dataAlerts: true,
  })
  const [notesKeyInput, setNotesKeyInput] = useState("")
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("profiles")
        .select("notes_key")
        .eq("id", user.id)
        .maybeSingle()
      if (data?.notes_key) {
        setNotesKeyInput("")
      }
    }
    checkAuth()
  }, [])

  const handleSaveNotesKey = async () => {
    if (!NOTES_KEY_PATTERN.test(notesKeyInput)) {
      toast({
        title: "Invalid key",
        description: "Key must be at least 4 alphanumeric characters (A-Z, a-z, 0-9).",
        variant: "destructive",
      })
      return
    }

    setSavingKey(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in.",
          variant: "destructive",
        })
        return
      }

      const ok = await setNotesKey(user.id, notesKeyInput)
      if (ok) {
        toast({
          title: "Key saved",
          description: "Your notes access key has been updated.",
        })
        setNotesKeyInput("")
      } else {
        throw new Error("Failed to save key.")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to save key.",
        variant: "destructive",
      })
    } finally {
      setSavingKey(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="english">
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="pst">
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pst">(GMT-08:00) Pacific Time</SelectItem>
                    <SelectItem value="est">(GMT-05:00) Eastern Time</SelectItem>
                    <SelectItem value="utc">(GMT+00:00) UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashboard">Default Dashboard View</Label>
                <Select defaultValue="overview">
                  <SelectTrigger id="dashboard">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="tools">Tools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle the application's theme.</p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable All Notifications</Label>
                </div>
                <Switch
                  checked={notifications.all}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, all: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Updates</Label>
                </div>
                <Switch
                  checked={notifications.system}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, system: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data Alerts</Label>
                </div>
                <Switch
                  checked={notifications.dataAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, dataAlerts: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sound">Notification Sound</Label>
                <Select defaultValue="default">
                  <SelectTrigger id="sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="chime">Chime</SelectItem>
                    <SelectItem value="bell">Bell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Manage your data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notes-key">Notes Access Key</Label>
                <p className="text-sm text-muted-foreground">
                  Set the key required to access your notes from the Tools page.
                  Leave a new key to replace the current one.
                </p>
                <Input
                  id="notes-key"
                  type="password"
                  value={notesKeyInput}
                  onChange={(e) => setNotesKeyInput(e.target.value)}
                  placeholder="At least 4 alphanumeric characters"
                  autoComplete="off"
                />
              </div>
              <Button
                onClick={handleSaveNotesKey}
                disabled={!NOTES_KEY_PATTERN.test(notesKeyInput) || savingKey}
              >
                {savingKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Key"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button
          onClick={() =>
            toast({
              title: "Settings saved",
              description: "Your preferences have been updated successfully.",
            })
          }
        >
          Save Changes
        </Button>
      </div>
    </div>
  )
}
