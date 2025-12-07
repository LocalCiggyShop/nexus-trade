import { APP_VERSION, APP_NAME, BUILD_DATE } from '@/lib/version'
import { Badge } from '@/components/ui/badge'

export default function VersionBadge() {
  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-3">
      <Badge variant="secondary" className="font-mono text-xs px-3 py-1.5 bg-background/80 backdrop-blur border">
        <span className="text-emerald-500 font-bold">{APP_NAME}</span>
        &nbsp;v{APP_VERSION}
      </Badge>
      <span className="text-xs text-muted-foreground font-mono">
        {new Date(BUILD_DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    </div>
  )
}