import { Separator } from '@/components/ui/separator'
import { UIState } from '@/lib/chat/actions'
import { Session } from '@/lib/types'
import Link from 'next/link'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { SafeCardErrorBoundary } from '@/components/error-boundary'

export interface ChatList {
  messages: UIState
  session?: Session
  isShared: boolean
  wide?: boolean
}

export function ChatList({
  messages,
  session,
  isShared,
  wide = false
}: ChatList) {
  if (!messages.length) {
    return null
  }

  return (
    <div
      className={`relative mx-auto px-4 ${wide ? 'max-w-6xl' : 'max-w-2xl'}`}
    >
      {messages.map((message, index) => (
        <div key={message.id}>
          <SafeCardErrorBoundary>
            {message.display}
          </SafeCardErrorBoundary>
          {index < messages.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  )
}
