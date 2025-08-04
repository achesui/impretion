import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(public)/legal/terms-and-conditions')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(public)/legal/terms-and-conditions"!</div>
}
