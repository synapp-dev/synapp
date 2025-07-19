"use client";

import { useOrganisationBySlug } from "@/stores/organisations/organisation-store";
import { notFound } from "next/navigation";
import { use } from "react";

export default function OrganisationPage({ params }: { params: Promise<{ organisation: string }> }) {
  // Use React.use() to unwrap the Promise in client component
  const { organisation: organisationParam } = use(params);
  
  // Always use slug since this route only handles organisation slugs
  const { organisation, isLoading, isError, error } = useOrganisationBySlug(organisationParam);
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (isError || !organisation) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold">{organisation.name}</h1>
          {organisation.description && (
            <p className="text-muted-foreground mt-2">{organisation.description}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Organization Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">ID:</span> {organisation.id}</p>
              <p><span className="font-medium">Slug:</span> {organisation.slug}</p>
              <p><span className="font-medium">Status:</span> {organisation.is_active ? 'Active' : 'Inactive'}</p>
              {organisation.created_at && (
                <p><span className="font-medium">Created:</span> {new Date(organisation.created_at).toLocaleDateString()}</p>
              )}
            </div>
          </div>
          
          {organisation.logo_url && (
            <div className="space-y-2">
              <h3 className="font-semibold">Logo</h3>
              <img 
                src={organisation.logo_url} 
                alt={`${organisation.name} logo`}
                className="w-32 h-32 object-contain border rounded"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
