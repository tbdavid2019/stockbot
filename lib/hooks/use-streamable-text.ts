import { StreamableValue, readStreamableValue } from 'ai/rsc'
import { useEffect, useState } from 'react'

export const useStreamableText = (
  content: string | StreamableValue<string>
) => {
  const [rawContent, setRawContent] = useState(
    typeof content === 'string' ? content : ''
  )

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      if (typeof content === 'object' && content !== null) {
        try {
          let value = ''
          for await (const delta of readStreamableValue(content)) {
            if (!isMounted) break
            if (typeof delta === 'string') {
              setRawContent((value = value + delta))
            }
          }
        } catch (err: any) {
          console.warn(
            '[useStreamableText] stream read caught safely:',
            err?.message || err
          )
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [content])

  return rawContent
}
