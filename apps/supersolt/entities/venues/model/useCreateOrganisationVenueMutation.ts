import { useMutation, useQueryClient } from "@tanstack/react-query";
import { venuesApi } from "@/entities/venues/api/endpoints";
import type { CreatedOrganisationVenueDto } from "@/entities/venues/model/types";
import { venuesKeys } from "@/entities/venues/model/keys";

export function useCreateOrganisationVenueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      organisationSlug: string;
      name: string;
      addressLine1?: string | null;
      timezone?: string;
    }): Promise<CreatedOrganisationVenueDto> => {
      const { data, error } = await venuesApi.post.createForOrganisation(
        input.organisationSlug,
        {
          name: input.name,
          addressLine1: input.addressLine1,
          timezone: input.timezone,
        }
      );
      if (error) {
        throw new Error(error.message);
      }
      if (!data?.venue) {
        throw new Error("Missing venue in response");
      }
      return data.venue;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: venuesKeys.groups() });
    },
  });
}
