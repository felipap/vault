import { getMessage } from "../../actions"
import { notFound } from "next/navigation"
import { MessageDrawer } from "./MessageDrawer"

type Props = {
  params: Promise<{ message_id: string }>
}

export default async function Page({ params }: Props) {
  const { message_id } = await params
  const message = await getMessage(message_id)

  if (!message) {
    notFound()
  }

  return <MessageDrawer message={message} />
}
