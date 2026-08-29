interface ChatLayoutProps {
  children: React.ReactNode
}

export default async function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="relative flex h-[calc(100dvh_-_theme(spacing.16))] overflow-hidden">
      {children}
    </div>
  )
}
