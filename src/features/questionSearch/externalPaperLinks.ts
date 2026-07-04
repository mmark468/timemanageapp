import type { Math9709PaperLink } from "./math9709PaperDatabase";
import type { CiePaperLink } from "./types";

const frankeCieWorkshopBaseUrl = "https://cie.fraft.cn";

export const externalPaperProviderName = frankeCieWorkshopBaseUrl ? "Frank 的 CIE 工坊" : "线上题库";
export const externalPaperProviderNeedsUrl = !frankeCieWorkshopBaseUrl;
export const externalPaperProviderHomeUrl = frankeCieWorkshopBaseUrl || "https://cie.fraft.cn";

function buildFrankeUrl(fileName: string) {
  if (!frankeCieWorkshopBaseUrl) return "";
  return `${frankeCieWorkshopBaseUrl.replace(/\/$/, "")}/obj/Common/Fetch/redir/${encodeURIComponent(fileName)}`;
}

export function toExternalPaperLink(link: Math9709PaperLink): Math9709PaperLink;
export function toExternalPaperLink(link: CiePaperLink): CiePaperLink;
export function toExternalPaperLink<T extends { url: string; fileName?: string }>(link: T): T {
  const nextUrl = link.fileName ? buildFrankeUrl(link.fileName) : "";
  return {
    ...link,
    url: nextUrl || link.url,
  };
}
