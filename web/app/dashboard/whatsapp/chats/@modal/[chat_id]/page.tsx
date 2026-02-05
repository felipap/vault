import { getWhatsappChatWithMessages } from "../../actions"
import { notFound } from "next/navigation"
import { ChatDrawer } from "./ChatDrawer"

type Props = {
  params: Promise<{ chat_id: string }>
}

export default async function Page({ params }: Props) {
  const { chat_id } = await params
  const decodedChatId = decodeURIComponent(chat_id)
  const chat = await getWhatsappChatWithMessages(decodedChatId)

  if (!chat) {
    notFound()
  }

  return <ChatDrawer chat={chat} />
}
