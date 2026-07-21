import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SectionCardProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

function SectionCard({ title, description, actions, children, className, contentClassName }: SectionCardProps) {
  return (
    <Card className={className}>
      {(title || description || actions) && (
        <CardHeader>
          <div className="flex flex-col gap-1">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}

export { SectionCard }
export type { SectionCardProps }
