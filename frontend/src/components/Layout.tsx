import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import SettingsPanel from './SettingsPanel'

export default function Layout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300">
      <Navbar
        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
        isSettingsOpen={isSettingsOpen}
      />
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
