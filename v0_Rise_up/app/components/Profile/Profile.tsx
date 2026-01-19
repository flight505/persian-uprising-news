"use client"

import { User, Bell, Globe, Moon, Sun, Shield, Info } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { useState } from "react"

export default function Profile() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [language, setLanguage] = useState<"en" | "fa">("en")
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-success mx-auto mb-4 flex items-center justify-center">
          <User className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Notifications */}
        <div className="glass-dark rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <p className="text-sm text-muted-foreground">Breaking news alerts</p>
              </div>
            </div>
            <Button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              variant={notificationsEnabled ? "default" : "outline"}
              size="sm"
              className="rounded-full"
            >
              {notificationsEnabled ? "On" : "Off"}
            </Button>
          </div>
        </div>

        {/* Language */}
        <div className="glass-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-info" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Language</h3>
              <p className="text-sm text-muted-foreground">Choose your language</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setLanguage("en")}
              variant={language === "en" ? "default" : "outline"}
              className="flex-1 rounded-full"
            >
              English
            </Button>
            <Button
              onClick={() => setLanguage("fa")}
              variant={language === "fa" ? "default" : "outline"}
              className="flex-1 rounded-full"
            >
              فارسی
            </Button>
          </div>
        </div>

        {/* Theme */}
        <div className="glass-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-5 h-5 text-warning" /> : <Sun className="w-5 h-5 text-warning" />}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Theme</h3>
              <p className="text-sm text-muted-foreground">Appearance preference</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setTheme("dark")}
              variant={theme === "dark" ? "default" : "outline"}
              className="flex-1 rounded-full"
            >
              <Moon className="w-4 h-4 mr-2" />
              Dark
            </Button>
            <Button
              onClick={() => setTheme("light")}
              variant={theme === "light" ? "default" : "outline"}
              className="flex-1 rounded-full"
            >
              <Sun className="w-4 h-4 mr-2" />
              Light
            </Button>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="glass-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground">Your data is never shared</p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="glass-dark rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
              <Info className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">About Persian Uprising News</h3>
              <p className="text-sm text-muted-foreground">Version 1.0.0 - Built with Material 3 Expressive</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
