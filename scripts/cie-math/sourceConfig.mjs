import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsFolder = path.dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = path.resolve(scriptsFolder, "../..");

export const official9709PageUrl =
  "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/past-papers/";

export const raw9709Folder = path.join(workspaceRoot, "content/cie-math/raw/9709");
export const databaseFolder = path.join(workspaceRoot, "content/cie-math/database");
export const downloadedManifestPath = path.join(databaseFolder, "official-download-manifest.json");
export const localManifestPath = path.join(databaseFolder, "resource-manifest.json");

export const allowedOfficialHosts = new Set(["www.cambridgeinternational.org"]);
