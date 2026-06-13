"use client";



import { usePathname, useRouter } from "next/navigation";

import { toast } from "sonner";

import { buildScopedPath } from "@/lib/build-scoped-path";

import {

  Select,

  SelectContent,

  SelectGroup,

  SelectItemWithLeadingIcon,

  SelectLabel,

  SelectTrigger,

  SelectValue,

} from "@workspace/ui/components/select";

import {

  INVENTORY_SETUP_SECTIONS,

  inventorySetupSectionFromPathname,

  type InventorySetupSectionSlug,

} from "@/app/(main)/[organisation]/[venue]/settings/inventory-setup/_components/inventory-setup-sections";

import { useInventorySetupProgressQuery } from "@/entities/inventory-setup/model/useInventorySetupProgressQuery";
import { isInventorySetupSectionsUnlockedForDev } from "@/lib/inventory-setup/dev-unlock-all-sections";



const LOCKED_UNTIL_PHASE1: InventorySetupSectionSlug[] = ["normalise"];



const LOCKED_UNTIL_PHASE2: InventorySetupSectionSlug[] = [

  "master-inventory-list",

  "pos-items",

  "storage-locations",

  "recipes",

];



export function InventorySetupSectionNav({

  organisationSlug,

  venueSlug,

}: {

  organisationSlug: string;

  venueSlug: string;

}) {

  const pathname = usePathname();

  const router = useRouter();

  const progressQuery = useInventorySetupProgressQuery({

    organisationSlug,

    venueSlug,

  });

  const activeSection =

    inventorySetupSectionFromPathname(pathname) ?? INVENTORY_SETUP_SECTIONS[0]!;

  const ActiveIcon = activeSection.icon;

  const devUnlockAll = isInventorySetupSectionsUnlockedForDev();
  const phase1Complete = progressQuery.data?.phase1Complete ?? false;

  const phase2Complete = progressQuery.data?.phase2Complete ?? false;



  function handleChange(slug: string) {

    const sectionSlug = slug as InventorySetupSectionSlug;



    if (devUnlockAll) {
      router.push(
        buildScopedPath(
          organisationSlug,
          venueSlug,
          `settings/inventory-setup/${sectionSlug}`,
        ),
      );
      return;
    }

    if (!phase1Complete && LOCKED_UNTIL_PHASE1.includes(sectionSlug)) {

      toast.message("Complete supplier and raw item setup first");

      return;

    }



    if (!phase2Complete && LOCKED_UNTIL_PHASE2.includes(sectionSlug)) {

      toast.message("Complete normalisation first");

      return;

    }



    router.push(

      buildScopedPath(

        organisationSlug,

        venueSlug,

        `settings/inventory-setup/${sectionSlug}`,

      ),

    );

  }



  function isLocked(slug: InventorySetupSectionSlug): boolean {

    if (devUnlockAll) return false;
    if (!phase1Complete && LOCKED_UNTIL_PHASE1.includes(slug)) return true;

    if (!phase2Complete && LOCKED_UNTIL_PHASE2.includes(slug)) return true;

    return false;

  }



  return (

    <Select value={activeSection.slug} onValueChange={handleChange}>

      <SelectTrigger

        aria-label="Inventory setup section"

        className="h-auto w-fit min-w-[12rem] gap-2 rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-lg font-semibold tracking-tight shadow-sm focus:ring-0 focus-visible:ring-2 focus-visible:ring-ring data-[placeholder]:text-foreground [&>svg]:size-4 [&>svg]:opacity-60"

      >

        <ActiveIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />

        <SelectValue />

      </SelectTrigger>

      <SelectContent align="start">

        <SelectGroup>

          <SelectLabel>Section</SelectLabel>

          {INVENTORY_SETUP_SECTIONS.map((section) => {

            const locked = isLocked(section.slug);

            return (

              <SelectItemWithLeadingIcon

                key={section.slug}

                value={section.slug}

                icon={section.icon}

                label={locked ? `${section.label} (locked)` : section.label}

                disabled={locked}

              />

            );

          })}

        </SelectGroup>

      </SelectContent>

    </Select>

  );

}

