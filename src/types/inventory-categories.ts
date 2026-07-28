import { Diamond, Gem, Layers, Package, FileText, Sparkles, type LucideIcon } from "lucide-react"

// The Inventory landing page's category registry. Adding a whole new
// category later means adding one entry here (plus its own dedicated
// table/types/UI) - never touching how the landing page itself renders.
export interface InventoryCategoryDef {
  id: string
  label: string
  description: string
  icon: LucideIcon
  href: string
  isImplemented: boolean
}

export const INVENTORY_CATEGORY_DEFS: InventoryCategoryDef[] = [
  {
    id: "loose_diamonds",
    label: "Loose Diamonds",
    description: "IGI/GIA graded stones - report number, carat, color, clarity, and grading detail.",
    icon: Diamond,
    href: "/inventory/diamonds",
    isImplemented: true,
  },
  {
    id: "jewelry",
    label: "Jewelry",
    description: "Finished pieces - SKU, metal, stone detail, and stock levels.",
    icon: Sparkles,
    href: "/inventory/jewelry",
    isImplemented: true,
  },
  {
    id: "gemstones",
    label: "Gemstones",
    description: "Colored stones outside the diamond grading workflow.",
    icon: Gem,
    href: "/inventory/gemstones",
    isImplemented: false,
  },
  {
    id: "findings",
    label: "Findings & Components",
    description: "Clasps, prongs, jump rings, and other assembly components.",
    icon: Layers,
    href: "/inventory/findings",
    isImplemented: false,
  },
  {
    id: "packaging",
    label: "Packaging",
    description: "Boxes, pouches, and presentation materials.",
    icon: Package,
    href: "/inventory/packaging",
    isImplemented: false,
  },
  {
    id: "certificates",
    label: "Certificates",
    description: "Grading and authenticity certificates not yet linked to a stone or piece.",
    icon: FileText,
    href: "/inventory/certificates",
    isImplemented: false,
  },
]
