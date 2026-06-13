import { apiFetchOrThrow } from "@/lib/api/client-envelope";
import type {
  AwardRateCardDto,
  OrgAwardConfigDto,
} from "@/server/workforce/award/award.service";

export type AwardRatesListPayload = {
  awards: Array<{
    awardCode: string;
    awardName: string;
    awardShortName: string;
    prReference: string;
    sourceUrl: string;
  }>;
  config: OrgAwardConfigDto;
};

export type { AwardRateCardDto, OrgAwardConfigDto };

export function awardRatesApiBase(organisation: string) {
  return `/organisations/${encodeURIComponent(organisation)}/award-rates`;
}

export const awardRatesApi = {
  async list(organisation: string): Promise<AwardRatesListPayload> {
    return apiFetchOrThrow<AwardRatesListPayload>(awardRatesApiBase(organisation));
  },

  async getRateCard(organisation: string, awardCode: string): Promise<AwardRateCardDto> {
    return apiFetchOrThrow<AwardRateCardDto>(
      `${awardRatesApiBase(organisation)}/${encodeURIComponent(awardCode)}`,
    );
  },

  async updateConfig(
    organisation: string,
    config: Partial<OrgAwardConfigDto>,
  ): Promise<AwardRatesListPayload> {
    return apiFetchOrThrow<AwardRatesListPayload>(`${awardRatesApiBase(organisation)}/config`, {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },

  async previewAwr(organisation: string, effectiveDate: string, awrYear: number) {
    const q = new URLSearchParams({ effectiveDate, awrYear: String(awrYear) });
    return apiFetchOrThrow<{ rows: Array<{
      userProfileId: string;
      awardCode: string;
      awardGrade: string;
      currentRateCents: number | null;
      newMinimumCents: number;
      action: string;
      checkedByDefault: boolean;
    }> }>(`${awardRatesApiBase(organisation)}/awr-uplift/preview?${q}`);
  },

  async applyAwr(
    organisation: string,
    body: {
      effectiveDate: string;
      awrYear: number;
      sourcePrReference: string;
      rows: Array<{ userProfileId: string; newRateCents: number }>;
    },
  ) {
    return apiFetchOrThrow<{ appliedCount: number; totalUpliftCents: number }>(
      `${awardRatesApiBase(organisation)}/awr-uplift/apply`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },
};
