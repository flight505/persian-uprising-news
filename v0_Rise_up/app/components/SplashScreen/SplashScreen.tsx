"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Show splash screen for 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Mobile splash */}
      <div className="md:hidden w-full h-full relative">
        <Image
          src="/images/splash-iphone.jpg"
          alt="Persian Uprising News - Your Voice, Your Freedom"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Tablet splash */}
      <div className="hidden md:block lg:hidden w-full h-full relative">
        <Image
          src="/images/splash-ipad.jpg"
          alt="Persian Uprising News - Your Voice, Your Freedom"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Desktop splash */}
      <div className="hidden lg:block w-full h-full relative">
        <Image
          src="/images/splash-webapp.jpg"
          alt="Persian Uprising News - Your Voice, Your Freedom"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  )
}
