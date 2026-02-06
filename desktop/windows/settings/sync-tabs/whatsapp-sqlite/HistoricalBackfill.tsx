import {
  HistoricalBackfill as GenericHistoricalBackfill,
  type HistoricalBackfillTheme,
} from '../HistoricalBackfill'

export function HistoricalBackfill() {
  return (
    <GenericHistoricalBackfill
      theme={'green' satisfies HistoricalBackfillTheme}
      backfillKey="whatsapp"
      getProgress={window.electron.getWhatsappBackfillProgress}
      startBackfill={window.electron.startWhatsappBackfill}
      cancelBackfill={window.electron.cancelWhatsappBackfill}
      defaultDays={50}
      title="Historical Backfill"
      description="Import historical WhatsApp messages from the local database. This may take a while for large date ranges."
      loadingLabel="Loading messages from WhatsApp database..."
    />
  )
}
