'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * The one control that changes what the app is for: an edit-heavy planner
 * before you go, a read-only companion once you are travelling.
 */
export function ModeSwitch({ base }: { base: string }) {
  const pathname = usePathname()
  const onTrip = pathname.startsWith(`${base}/today`)

  return (
    <div className="switch" role="group" aria-label="Mode">
      <Link href={base} data-active={!onTrip}>
        Planning
      </Link>
      <Link href={`${base}/today`} className="live" data-active={onTrip}>
        On Trip
      </Link>
    </div>
  )
}
