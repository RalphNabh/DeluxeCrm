"use client"

import * as React from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
} & React.ComponentProps<"div">

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    const stored = localStorage.getItem(storageKey) as Theme | null
    return stored || defaultTheme
  })

  React.useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    let observer: MutationObserver | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      
      // Force update body
      if (systemTheme === "dark") {
        document.body.style.backgroundColor = "hsl(222.2, 84%, 4.9%)"
        document.body.style.color = "hsl(210, 40%, 98%)"
        
        // Force update page containers
        timeoutId = setTimeout(() => {
          const containers = document.querySelectorAll('div[class*="min-h-screen"]')
          containers.forEach(el => {
            const htmlEl = el as HTMLElement
            htmlEl.style.backgroundColor = "hsl(222.2, 84%, 4.9%)"
            htmlEl.style.background = "hsl(222.2, 84%, 4.9%)"
          })
        }, 100)
      } else {
        document.body.style.backgroundColor = "#ffffff"
        document.body.style.color = "#171717"
      }
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId)
        if (observer) observer.disconnect()
      }
    }

    root.classList.add(theme)
    
    // Force update body based on theme
    if (theme === "dark") {
      document.body.style.backgroundColor = "hsl(222.2, 84%, 4.9%)"
      document.body.style.color = "hsl(210, 40%, 98%)"
      
      // Force update all page containers - more aggressive approach
      timeoutId = setTimeout(() => {
        const containers = document.querySelectorAll('div[class*="min-h-screen"], div[class*="bg-gray-50"], div[class*="bg-white"], div[class*="bg-gray-100"]')
        containers.forEach(el => {
          const htmlEl = el as HTMLElement
          if (htmlEl.classList.contains('min-h-screen')) {
            htmlEl.style.backgroundColor = "hsl(222.2, 84%, 4.9%)"
            htmlEl.style.background = "hsl(222.2, 84%, 4.9%)"
          } else if (htmlEl.classList.contains('bg-gray-50') || htmlEl.classList.contains('bg-white') || htmlEl.classList.contains('bg-gray-100')) {
            htmlEl.style.backgroundColor = "hsl(217.2, 32.6%, 17.5%)"
            htmlEl.style.background = "hsl(217.2, 32.6%, 17.5%)"
          }
        })
      }, 100)
      
      // Also force update using MutationObserver for dynamic content
      observer = new MutationObserver(() => {
        const containers = document.querySelectorAll('div[class*="min-h-screen"]')
        containers.forEach(el => {
          const htmlEl = el as HTMLElement
          htmlEl.style.backgroundColor = "hsl(222.2, 84%, 4.9%)"
          htmlEl.style.background = "hsl(222.2, 84%, 4.9%)"
        })
      })
      
      observer.observe(document.body, { childList: true, subtree: true })
    } else {
      document.body.style.backgroundColor = "#ffffff"
      document.body.style.color = "#171717"
      
      // Reset page containers
      timeoutId = setTimeout(() => {
        const containers = document.querySelectorAll('[class*="min-h-screen"]')
        containers.forEach(el => {
          (el as HTMLElement).style.backgroundColor = ""
          ;(el as HTMLElement).style.background = ""
        })
      }, 50)
    }
    
    // Cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (observer) observer.disconnect()
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
