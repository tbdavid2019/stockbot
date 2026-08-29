interface ChatLayoutProps {
  children: React.ReactNode
}

// Tool routing and financial cards may perform multiple upstream requests.
// Keep the Server Action alive long enough on Vercel without relying on the
// platform's short default duration.
export const maxDuration = 60

export default async function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="relative flex h-[calc(100dvh_-_3rem)] overflow-hidden sm:h-[calc(100dvh_-_3.5rem)]">
      {children}
    </div>
  )
}
