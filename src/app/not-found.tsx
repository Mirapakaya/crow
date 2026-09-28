import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground">That page does not exist.</p>
      <Button asChild>
        <Link href="/">Open Crow</Link>
      </Button>
    </div>
  )
}
