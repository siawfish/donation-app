import Navbar from "@/components/ui/navbar"
import React from "react"

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar />
      <div className="flex-1 py-12 px-6 flex justify-center">
        {children}
      </div>
    </div>
  )
}
