interface ChatLayoutProps {
  children: React.ReactNode
}

export default async function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="relative flex h-[calc(100dvh_-_3rem)] overflow-hidden sm:h-[calc(100dvh_-_3.5rem)]">
      {children}
    </div>
  )
}
