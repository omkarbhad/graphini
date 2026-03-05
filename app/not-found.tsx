import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShiningText } from '@/components/ui/shining-text'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <div className="text-2xl font-semibold text-gray-600 mb-2">
            <ShiningText text="Page Not Found" className="text-lg" />
          </div>
          <p className="text-gray-500 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link href="/">
            <Button className="px-6 py-3">
              Go Back Home
            </Button>
          </Link>
          
          <div className="text-sm text-gray-400">
            <p>Or try asking the AI to create a diagram:</p>
            <p className="font-mono text-xs mt-1">
              &quot;Create a flowchart for user authentication&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
