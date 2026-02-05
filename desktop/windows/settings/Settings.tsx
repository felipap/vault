import { useEffect, useState } from 'react'
import { MainTab } from './main/MainTab'
import { LogsTab } from './log-viewer/LogsTab'

type Tab = 'general' | 'logs'

function getInitialTab(): Tab {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'logs' || tab === 'general') {
    return tab
  }
  return 'general'
}

function getHighlightSyncId(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('highlightSyncId')
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-[var(--text-color-secondary)] hover:text-[var(--color-contrast)]'
      }`}
    >
      {children}
    </button>
  )
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)
  const [highlightSyncId, setHighlightSyncId] = useState<string | null>(
    getHighlightSyncId,
  )

  // Update state when URL changes (e.g., from tray click)
  useEffect(() => {
    function handleLocationChange() {
      setActiveTab(getInitialTab())
      setHighlightSyncId(getHighlightSyncId())
    }

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange)

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  // Clear highlight after a delay
  useEffect(() => {
    if (highlightSyncId) {
      const timeout = setTimeout(() => {
        setHighlightSyncId(null)
        // Clear the URL parameter
        const url = new URL(window.location.href)
        url.searchParams.delete('highlightSyncId')
        window.history.replaceState({}, '', url.toString())
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [highlightSyncId])

  return (
    <div className="h-screen flex flex-col bg-[var(--background-color-one)]">
      <div className="flex-shrink-0 border-b px-4 pt-2">
        <div className="flex gap-2">
          <TabButton
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
          >
            General
          </TabButton>
          <TabButton
            active={activeTab === 'logs'}
            onClick={() => setActiveTab('logs')}
          >
            Logs
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'general' && <MainTab />}
        {activeTab === 'logs' && <LogsTab highlightSyncId={highlightSyncId} />}
      </div>
    </div>
  )
}
