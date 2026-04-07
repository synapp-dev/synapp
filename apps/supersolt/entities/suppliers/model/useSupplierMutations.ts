"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersApi } from "@/entities/suppliers/api/endpoints";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import type { UpsertSupplierInput } from "@/entities/suppliers/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

type CreateSupplierInput = ScopedInput & {
  payload: UpsertSupplierInput;
};

type UpdateSupplierInput = ScopedInput & {
  supplierId: string;
  payload: UpsertSupplierInput;
};

type DeleteSupplierInput = ScopedInput & {
  supplierId: string;
};

export function useSupplierMutations(scope: ScopedInput) {
  const queryClient = useQueryClient();

  const invalidateScopedQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: suppliersKeys.scope(scope.organisationSlug, scope.venueSlug),
    });
  };

  const createSupplier = useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const { data, error } = await suppliersApi.post.create(
        input.organisationSlug,
        input.venueSlug,
        input.payload
      );

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Failed to create supplier");
      }
      return data;
    },
    onSuccess: invalidateScopedQueries,
  });

  const updateSupplier = useMutation({
    mutationFn: async (input: UpdateSupplierInput) => {
      const { data, error } = await suppliersApi.patch.update(input);
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Failed to update supplier");
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidateScopedQueries();
      await queryClient.invalidateQueries({
        queryKey: suppliersKeys.detail(
          variables.organisationSlug,
          variables.venueSlug,
          variables.supplierId
        ),
      });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (input: DeleteSupplierInput) => {
      const { data, error } = await suppliersApi.delete.byId(input);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidateScopedQueries();
      await queryClient.removeQueries({
        queryKey: suppliersKeys.detail(
          variables.organisationSlug,
          variables.venueSlug,
          variables.supplierId
        ),
      });
    },
  });

  return {
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
