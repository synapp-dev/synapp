"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierProductsApi } from "@/entities/supplier-products/api/endpoints";
import { supplierProductKeys } from "@/entities/supplier-products/model/keys";
import type { UpsertSupplierProductInput } from "@/entities/supplier-products/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
};

export function useSupplierProductMutations(scope: ScopedInput) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: supplierProductKeys.bySupplier(
        scope.organisationSlug,
        scope.venueSlug,
        scope.supplierId,
      ),
    });
  };

  const createProduct = useMutation({
    mutationFn: async (payload: UpsertSupplierProductInput) => {
      const { data, error } = await supplierProductsApi.post.create({
        ...scope,
        payload,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Failed to create product");
      return data;
    },
    onSuccess: invalidate,
  });

  const updateProduct = useMutation({
    mutationFn: async (args: {
      productId: string;
      payload: UpsertSupplierProductInput;
    }) => {
      const { data, error } = await supplierProductsApi.patch.update({
        ...scope,
        productId: args.productId,
        payload: args.payload,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Failed to update product");
      return data;
    },
    onSuccess: invalidate,
  });

  const makeActive = useMutation({
    mutationFn: async (args: { productId: string; propagateCost?: boolean }) => {
      const { data, error } = await supplierProductsApi.post.makeActive({
        ...scope,
        productId: args.productId,
        propagateCost: args.propagateCost,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Failed to set active product");
      return data;
    },
    onSuccess: invalidate,
  });

  const archiveProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supplierProductsApi.delete.archive({
        ...scope,
        productId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  return { createProduct, updateProduct, makeActive, archiveProduct };
}
