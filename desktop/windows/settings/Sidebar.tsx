import {
  ContactsIcon,
  IMessageIcon,
  ScreenCaptureIcon,
  WhatsappIcon,
} from '../shared/ui/icons'
import { SyncLogSource } from '../electron'

export type ActiveTab = 'general' | 'logs' | 'mcp' | SyncLogSource

export type DataSourceInfo = {
  source: SyncLogSource
  label: string
  enabled: boolean
  lastSyncFailed: boolean
}

type Props = {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  enabledSources: DataSourceInfo[]
  disabledSources: DataSourceInfo[]
}

const SYNC_SOURCE_ICONS: Record<
  SyncLogSource,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  screenshots: ScreenCaptureIcon,
  imessage: IMessageIcon,
  contacts: ContactsIcon,
  'whatsapp-sqlite': WhatsappIcon,
  'whatsapp-unipile': WhatsappIcon,
}

function SidebarButton({
  active,
  onClick,
  children,
  disabled,
  hasError,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  hasError?: boolean
  icon?: React.ComponentType<{ size?: number; className?: string }>
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-sm text-left rounded-md transition-colors flex items-center justify-between gap-2 ${
        active
          ? 'bg-blue-500 text-white'
          : disabled
            ? 'text-secondary opacity-60 hover:bg-[var(--background-color-three)]'
            : 'text-[var(--color-contrast)] hover:bg-[var(--background-color-three)]'
      }`}
    >
      <span className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={16} className="shrink-0" />}
        {children}
      </span>
      {hasError && !active && (
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
      )}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
      {children}
    </div>
  )
}

export function Sidebar({
  activeTab,
  onSelectTab,
  enabledSources,
  disabledSources,
}: Props) {
  return (
    <div className="w-52 shrink-0 border-r bg-two flex flex-col">
      <div className="p-2 space-y-1">
        <SidebarButton
          active={activeTab === 'general'}
          onClick={() => onSelectTab('general')}
        >
          General
        </SidebarButton>
        <SidebarButton
          active={activeTab === 'logs'}
          onClick={() => onSelectTab('logs')}
        >
          All Logs
        </SidebarButton>
        <SidebarButton
          active={activeTab === 'mcp'}
          onClick={() => onSelectTab('mcp')}
        >
          MCP Server
        </SidebarButton>
      </div>

      <div className="border-t my-2" />

      <div className="flex-1 overflow-auto px-2 pb-2">
        {enabledSources.length > 0 && (
          <div className="mb-2">
            <SectionLabel>Enabled</SectionLabel>
            <div className="space-y-1">
              {enabledSources.map((info) => (
                <SidebarButton
                  key={info.source}
                  active={activeTab === info.source}
                  onClick={() => onSelectTab(info.source)}
                  hasError={info.lastSyncFailed}
                  icon={SYNC_SOURCE_ICONS[info.source]}
                >
                  {info.label}
                </SidebarButton>
              ))}
            </div>
          </div>
        )}

        {disabledSources.length > 0 && (
          <div>
            <SectionLabel>Disabled</SectionLabel>
            <div className="space-y-1">
              {disabledSources.map((info) => (
                <SidebarButton
                  key={info.source}
                  active={activeTab === info.source}
                  onClick={() => onSelectTab(info.source)}
                  disabled
                  icon={SYNC_SOURCE_ICONS[info.source]}
                >
                  {info.label}
                </SidebarButton>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
