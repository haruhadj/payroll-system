"use client"

import { useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, Building2 } from "lucide-react"
import { SidebarNav } from "./sidebar"

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="md:hidden flex items-center gap-2 border-b border-border/70 px-3 h-14 bg-background/90 backdrop-blur-lg sticky top-0 z-40">
      <Sheet open={open} onOpenChange={setOpen}>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <SheetContent side="left" className="p-0 w-72" showCloseButton={false}>
          <SidebarNav onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <div className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg shadow-sm">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold tracking-tight">PayrollPH</span>
      </div>
    </header>
  )
}
