import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { getMissingKeys } from '@/app/actions'

export const metadata = {
  title: '888 StockBot'
}

export default async function ChatPage({
  params
}: {
  params: { id: string }
}) {
  const missingKeys = await getMissingKeys()

  return (
    <AI initialAIState={{ chatId: params.id, messages: [] }}>
      <Chat id={params.id} missingKeys={missingKeys} />
    </AI>
  )
}
