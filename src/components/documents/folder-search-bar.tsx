"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { SearchInput } from "@/components/shared/search-input"

export function FolderSearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("folderQuery") ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (search) {
        params.set("folderQuery", search)
      } else {
        params.delete("folderQuery")
      }
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return <SearchInput value={search} onChange={setSearch} placeholder="Search folders..." className="max-w-xs" />
}
