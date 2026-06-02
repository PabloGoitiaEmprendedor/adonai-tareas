import { Paperclip } from "lucide-react"

import { getEventLinks } from "./event-manager-utils"

export const EventLinkClips = ({ links, color }: { links?: string[]; color?: string }) => {
  const urls = getEventLinks(links)
  if (urls.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {urls.map((url, index) => {
        const href = url.startsWith('http') ? url : `https://${url}`
        return (
          <a
            key={`${url}-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/20 bg-background/70 text-foreground shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Abrir link"
          >
            <Paperclip
              className="h-3.5 w-3.5"
              style={{ color: color && (color.startsWith('#') || color.startsWith('var')) ? color : undefined }}
            />
          </a>
        )
      })}
    </div>
  )
}
