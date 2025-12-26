import { IMessageSDK } from '@photon-ai/imessage-kit'

export type Message = {
  id: string
  text: string
  sender: string
  isFromMe: boolean
  date: Date
  chatId: string
  isGroup: boolean
}

// AI says we need a separate SDK because each keeps a database connection open,
// and it'd be wasteful to do one per call to `fetchMessages`.
export function createIMessageSDK(): IMessageSDK {
  return new IMessageSDK({ debug: false })
}

export async function fetchMessages(
  sdk: IMessageSDK,
  since: Date,
): Promise<Message[]> {
  const result = await sdk.getMessages({
    since,
    limit: 100,
    excludeOwnMessages: false,
  })

  return result.messages.map((msg) => ({
    id: msg.id,
    text: msg.text || '',
    sender: msg.sender,
    isFromMe: msg.isFromMe,
    date: msg.date,
    chatId: msg.chatId,
    isGroup: msg.isGroupChat,
  }))
}
