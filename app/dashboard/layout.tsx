import { Sidebar } from '@/components/sidebar'
import { getEvaluationCount } from '@/app/actions/projects'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const evaluationCount = await getEvaluationCount()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar evaluationCount={evaluationCount} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">{children}</div>
    </div>
  )
}