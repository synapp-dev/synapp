export type XeroApiAddress = {
  AddressType?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  City?: string;
  Region?: string;
  PostalCode?: string;
  Country?: string;
};

export type XeroApiPhone = {
  PhoneType?: string;
  PhoneNumber?: string;
};

export type XeroApiContact = {
  ContactID?: string;
  ContactStatus?: string;
  Name?: string;
  EmailAddress?: string;
  TaxNumber?: string;
  IsSupplier?: boolean;
  Addresses?: XeroApiAddress[];
  Phones?: XeroApiPhone[];
};

export type MappedXeroSupplier = {
  xeroContactId: string;
  name: string;
  email: string | null;
  orderingEmail: string | null;
  phone: string | null;
  abn: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
};

function pickAddress(addresses: XeroApiAddress[] | undefined): XeroApiAddress | null {
  if (!addresses?.length) return null;
  return (
    addresses.find((a) => a.AddressType === "POBOX") ??
    addresses.find((a) => a.AddressType === "STREET") ??
    addresses[0] ??
    null
  );
}

function pickPhone(phones: XeroApiPhone[] | undefined): string | null {
  if (!phones?.length) return null;
  const mobile =
    phones.find((p) => p.PhoneType === "MOBILE") ??
    phones.find((p) => p.PhoneType === "DEFAULT") ??
    phones[0];
  const num = mobile?.PhoneNumber?.trim();
  return num && num.length > 0 ? num : null;
}

export function mapXeroApiContact(contact: XeroApiContact): MappedXeroSupplier | null {
  const xeroContactId = contact.ContactID?.trim();
  const name = contact.Name?.trim();
  if (!xeroContactId || !name) return null;
  if (contact.ContactStatus === "ARCHIVED") return null;

  const email = contact.EmailAddress?.trim() || null;
  const address = pickAddress(contact.Addresses);

  return {
    xeroContactId,
    name,
    email,
    orderingEmail: email,
    phone: pickPhone(contact.Phones),
    abn: contact.TaxNumber?.trim() || null,
    addressLine1: address?.AddressLine1?.trim() || null,
    addressLine2: address?.AddressLine2?.trim() || null,
    suburb: address?.City?.trim() || null,
    state: address?.Region?.trim() || null,
    postcode: address?.PostalCode?.trim() || null,
    country: address?.Country?.trim() || null,
  };
}

export function normalizeSupplierName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
