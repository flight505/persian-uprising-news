"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"

export default function NotificationButton() {
  const [isEnabled, setIsEnabled] = useState(false)

  const handleToggle = () => {
    setIsEnabled(!isEnabled)
    // Placeholder for notification functionality
    console.log("Notifications:", !isEnabled ? "enabled" : "disabled")
  }

  return (
    <Button
      onClick={handleToggle}
      variant={isEnabled ? "default" : "outline"}
      title={isEnabled ? "Disable notifications" : "Enable notifications"}
    >
      {isEnabled ? "🔔" : "🔕"} Notify
    </Button>
  )
}
