import { useState, useEffect, useRef, useCallback } from 'react'

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  // Always render the same initial value on server and client. Reading
  // localStorage during the state initializer causes hydration mismatches.
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const initialValueRef = useRef(initialValue)

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value)
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(value))
          window.dispatchEvent(new Event('local-storage-change'))
        }
      } catch (error) {
        console.error('Error writing to localStorage:', error)
      }
    },
    [key]
  )

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = localStorage.getItem(key)
        setStoredValue(item ? JSON.parse(item) : initialValueRef.current)
      } catch (error) {
        console.error('Error handling storage change:', error)
      }
    }

    handleStorageChange()
    window.addEventListener('local-storage-change', handleStorageChange)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('local-storage-change', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key])

  return [storedValue, setValue]
}
