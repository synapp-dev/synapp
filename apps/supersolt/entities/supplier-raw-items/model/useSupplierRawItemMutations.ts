"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierRawItemsApi } from "@/entities/supplier-raw-items/api/endpoints";
import { supplierRawItemsKeys } from "@/entities/supplier-raw-items/model/keys";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import type {
  ApproveSupplierAsProductsInput,
  ApproveSupplierRawItemsInput,
  ConfirmSupplierItemsTriageInput,
  CreateSupplierRawItemInput,
  SkipSupplierItemsInput,
  UpdateSupplierRawItemInput,
} from "@/entities/supplier-raw-items/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
};

export function useSupplierRawItemMutations(scoped: ScopedInput) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: supplierRawItemsKeys.all });
    await queryClient.invalidateQueries({
      queryKey: inventorySetupKeys.progress(scoped.organisationSlug, scoped.venueSlug),
    });
  };

  const createRawItem = useMutation({
    mutationFn: async (payload: CreateSupplierRawItemInput) => {
      const { data, error } = await supplierRawItemsApi.post.create({
        ...scoped,
        payload,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateRawItem = useMutation({
    mutationFn: async (input: { rawItemId: string; payload: UpdateSupplierRawItemInput }) => {
      const { data, error } = await supplierRawItemsApi.patch.update({
        ...scoped,
        rawItemId: input.rawItemId,
        payload: input.payload,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const approveRawItems = useMutation({
    mutationFn: async (input: ApproveSupplierRawItemsInput) => {
      const { data, error } = await supplierRawItemsApi.post.approveMany({
        ...scoped,
        payload: input,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const approveAsProducts = useMutation({
    mutationFn: async (input: ApproveSupplierAsProductsInput) => {
      const { data, error } = await supplierRawItemsApi.post.approveAsProducts({
        ...scoped,
        payload: input,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async () => {
      await invalidate();
      // Created catalog rows — refresh products + supplier summaries.
      await queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const skipNotInventory = useMutation({
    mutationFn: async (input: SkipSupplierItemsInput) => {
      const { data, error } = await supplierRawItemsApi.post.skipNotInventory({
        ...scoped,
        payload: input,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const confirmItemsTriage = useMutation({
    mutationFn: async (input: ConfirmSupplierItemsTriageInput) => {
      const { data, error } = await supplierRawItemsApi.post.confirmItemsTriage({
        ...scoped,
        payload: input,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async () => {
      await invalidate();
      // Review counts changed — refresh supplier summaries/readiness.
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const archiveRawItem = useMutation({
    mutationFn: async (rawItemId: string) => {
      const { data, error } = await supplierRawItemsApi.delete.archive({
        ...scoped,
        rawItemId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    createRawItem,
    updateRawItem,
    approveRawItems,
    approveAsProducts,
    skipNotInventory,
    confirmItemsTriage,
    archiveRawItem,
  };
}
