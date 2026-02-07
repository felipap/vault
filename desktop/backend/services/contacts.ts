import { startAnimating, stopAnimating } from '../tray/animate'
import { fetchContacts, uploadContacts } from '../sources/contacts'
import { createScheduledService } from './scheduler'

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

async function syncAndUpload(): Promise<void> {
  console.log('[contacts] Syncing...')
  await yieldToEventLoop()

  const contacts = fetchContacts()
  if (contacts.length === 0) {
    console.log('[contacts] No contacts to sync')
    return
  }

  console.log(`Fetched ${contacts.length} contacts`)
  await yieldToEventLoop()

  startAnimating('vault-rotation')
  try {
    await uploadContacts(contacts)
  } finally {
    stopAnimating()
  }
}

export const contactsService = createScheduledService({
  name: 'contacts',
  configKey: 'contactsSync',
  onSync: syncAndUpload,
})
