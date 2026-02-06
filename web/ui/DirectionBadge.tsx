import { ArrowDownIcon, ArrowUpIcon } from "@/ui/icons"

type Props = {
  isFromMe: boolean
}

export function DirectionBadge({ isFromMe }: Props) {
  if (isFromMe) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <ArrowUpIcon />
        Sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <ArrowDownIcon />
      Received
    </span>
  )
}
