'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface HideValuesContextType {
  hideValues: boolean
  toggleHideValues: () => void
}

const HideValuesContext = createContext<HideValuesContextType | undefined>(undefined)

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hideValues, setHideValues] = useState(false)

  // Restaura a preferência salva no navegador
  useEffect(() => {
    const saved = localStorage.getItem('hideValues')
    if (saved === 'true') setHideValues(true)
  }, [])

  const toggleHideValues = () => {
    setHideValues((prev) => {
      const next = !prev
      localStorage.setItem('hideValues', String(next))
      return next
    })
  }

  return (
    <HideValuesContext.Provider value={{ hideValues, toggleHideValues }}>
      {children}
    </HideValuesContext.Provider>
  )
}

export function useHideValues() {
  const context = useContext(HideValuesContext)
  if (context === undefined) {
    throw new Error('useHideValues deve ser usado dentro de um HideValuesProvider')
  }
  return context
}