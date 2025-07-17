import { useEffect } from "react";
import { useOrganisationsQuery } from "./read";
import { useOrganisationStore } from "@/stores/organisationStore";

export function useSyncOrganisationsToStore() {
  const { data, isSuccess } = useOrganisationsQuery();
  const setOrganisations = useOrganisationStore((s) => s.setOrganisations);

  useEffect(() => {
    if (isSuccess && data?.data) {
      setOrganisations(data.data);
    }
  }, [isSuccess, data, setOrganisations]);
}
