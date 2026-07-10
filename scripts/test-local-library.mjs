import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "time-planning-library-tests-"));
const outputFile = path.join(temporaryDirectory, "library-utils.mjs");

try {
  await build({
    entryPoints: [path.resolve("src/features/localLibrary/libraryUtils.ts")],
    outfile: outputFile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "silent",
  });

  const {
    canPreviewInApp,
    createFileFingerprint,
    getFileExtension,
    isSupportedFile,
    makeUniqueDisplayName,
    matchesResourceQuery,
    sortResources,
    validateImportFile,
  } = await import(pathToFileURL(outputFile).href);

  assert.equal(getFileExtension("paper.FINAL.PDF"), "pdf");
  assert.equal(getFileExtension("README"), "");
  assert.equal(isSupportedFile("notes.docx"), true);
  assert.equal(isSupportedFile("archive.zip"), false);
  assert.equal(validateImportFile({ name: "empty.pdf", size: 0 }), "文件为空或无法读取");
  assert.equal(validateImportFile({ name: "video.mp4", size: 20 }), "暂不支持此文件格式");
  assert.equal(makeUniqueDisplayName("paper.pdf", ["paper.pdf", "paper (2).pdf"]), "paper (3).pdf");
  assert.equal(createFileFingerprint({ name: "Paper.PDF", size: 120, lastModified: 10 }), "paper.pdf::120::10");

  const resources = [
    {
      id: "2",
      displayName: "B paper.pdf",
      originalFileName: "B paper.pdf",
      fileExtension: "pdf",
      mimeType: "application/pdf",
      importedAt: "2026-07-09T10:00:00.000Z",
      lastOpenedAt: null,
    },
    {
      id: "1",
      displayName: "A notes.txt",
      originalFileName: "A notes.txt",
      fileExtension: "txt",
      mimeType: "text/plain",
      importedAt: "2026-07-10T10:00:00.000Z",
      lastOpenedAt: "2026-07-10T11:00:00.000Z",
    },
  ];

  assert.deepEqual(sortResources(resources, "name").map((resource) => resource.id), ["1", "2"]);
  assert.deepEqual(sortResources(resources, "imported_at").map((resource) => resource.id), ["1", "2"]);
  assert.equal(matchesResourceQuery(resources[0], "paper"), true);
  assert.equal(matchesResourceQuery(resources[0], "notes"), false);
  assert.equal(canPreviewInApp(resources[0]), "pdf");
  assert.equal(canPreviewInApp(resources[1]), "text");

  console.log("Local library utility tests passed (14 assertions).");
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
