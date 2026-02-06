import {
  HistoricalBackfill as GenericHistoricalBackfill,
  type HistoricalBackfillTheme,
} from '../HistoricalBackfill'

export function HistoricalBackfill() {
  return (
    <GenericHistoricalBackfill
      theme={'blue' satisfies HistoricalBackfillTheme}
      backfillKey="imessage"
      getProgress={window.electron.getIMessageBackfillProgress}
      startBackfill={window.electron.startIMessageBackfill}
      cancelBackfill={window.electron.cancelIMessageBackfill}
      defaultDays={50}
      title="Historical Backfill"
      description="Import historical messages. This may take a while for large date ranges."
      loadingLabel="Loading messages from iMessage into memory..."
    />
  )
}
