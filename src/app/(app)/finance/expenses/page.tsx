import Link from "next/link"
import { ChevronRight, Receipt } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { ExpenseFormDialog } from "@/components/finance/expense-form-dialog"
import { ExpenseFilters } from "@/components/finance/expense-filters"
import { ExpenseTable } from "@/components/finance/expense-table"
import { PermissionGate } from "@/components/providers/permission-gate"
import { requirePageView } from "@/lib/require-page-permission"
import { createClient } from "@/lib/supabase/server"
import { FINANCE_EXPENSES_PAGE_SIZE, getExpenses } from "@/lib/supabase/finance-expenses"
import { FINANCE_EXPENSE_CATEGORIES } from "@/types/finance"
import type { FinanceExpenseCategory } from "@/types/finance"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

interface ExpensesPageProps {
  searchParams: Promise<{ category?: string; dateAfter?: string }>
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  await requirePageView("finance")

  const { category, dateAfter } = await searchParams
  const supabase = await createClient()

  const validCategory = FINANCE_EXPENSE_CATEGORIES.includes(category as FinanceExpenseCategory)
    ? (category as FinanceExpenseCategory)
    : undefined

  const { expenses, hasMore } = await getExpenses(supabase, {
    category: validCategory,
    expenseDateAfter: dateAfter,
    limit: FINANCE_EXPENSES_PAGE_SIZE,
  })

  const totalOnPage = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/finance" className="hover:text-foreground hover:underline">
          Finance
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Company Expenses</span>
      </nav>

      <PageHeader
        title="Company Expenses"
        description="Salaries, rent, and everything else not tied to manufacturing or sellers."
        actions={
          <PermissionGate module="finance" action="create">
            <ExpenseFormDialog mode="create" />
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Expenses Shown" value={expenses.length} icon={Receipt} />
        <StatCard label="Total Shown" value={formatCurrency(totalOnPage)} />
      </div>

      <ExpenseFilters />
      <ExpenseTable key={`${validCategory ?? ""}-${dateAfter ?? ""}`} expenses={expenses} hasMore={hasMore} category={validCategory} expenseDateAfter={dateAfter} />
    </div>
  )
}
