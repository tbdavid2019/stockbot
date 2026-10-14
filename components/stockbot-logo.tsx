import Image from 'next/image'

export function StockbotLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/stockbot-logo.png"
      alt="888 Stock Bot"
      width={256}
      height={256}
      className={className}
      unoptimized
    />
  )
}
