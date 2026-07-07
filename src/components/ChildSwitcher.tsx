"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ChildSwitcher({
  childOptions,
  selectedId,
}: {
  childOptions: { id: string; name: string; email: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(childId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("child", childId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <label htmlFor="child-switcher">자녀 선택: </label>
      <select
        id="child-switcher"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
      >
        {childOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.email})
          </option>
        ))}
      </select>
    </div>
  );
}
