import dynamic from "next/dynamic"

import { ChartSkeleton } from "@/components/reports/chart-skeleton"

// recharts is a genuinely heavy dependency; these are the only place it's
// used. Splitting each chart into its own chunk (loaded after the page's
// main bundle, once the client hydrates) keeps recharts out of the initial
// JS for Dashboard and Reports - both pages already have the underlying
// data ready server-side, so this only defers the chart *rendering
// library*, not the data fetch.
export const RevenueChart = dynamic(() => import("@/components/reports/revenue-chart").then((mod) => mod.RevenueChart), {
  loading: () => <ChartSkeleton />,
})
export const OrdersChart = dynamic(() => import("@/components/reports/orders-chart").then((mod) => mod.OrdersChart), {
  loading: () => <ChartSkeleton />,
})
export const ProductionChart = dynamic(() => import("@/components/reports/production-chart").then((mod) => mod.ProductionChart), {
  loading: () => <ChartSkeleton />,
})
export const InventoryChart = dynamic(() => import("@/components/reports/inventory-chart").then((mod) => mod.InventoryChart), {
  loading: () => <ChartSkeleton />,
})
export const CustomerChart = dynamic(() => import("@/components/reports/customer-chart").then((mod) => mod.CustomerChart), {
  loading: () => <ChartSkeleton />,
})
export const TaskChart = dynamic(() => import("@/components/reports/task-chart").then((mod) => mod.TaskChart), {
  loading: () => <ChartSkeleton />,
})
export const EmployeeChart = dynamic(() => import("@/components/reports/employee-chart").then((mod) => mod.EmployeeChart), {
  loading: () => <ChartSkeleton />,
})
