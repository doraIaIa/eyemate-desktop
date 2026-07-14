export type DeletionResult = "DELETED" | "PARTIALLY_DELETED" | "FAILED";
export interface ExportPreview { readonly schemaVersion: "m1-export-0.1.0"; readonly source: "SURVEY_ONLY"; readonly fields: readonly ("summary" | "coverage" | "limitation" | "provenance")[]; readonly requiresDestinationConfirmation: true; readonly disclaimer: "NOT_A_DIAGNOSIS"; }

export function createSurveyOnlyExportPreview(): ExportPreview {
  return { schemaVersion: "m1-export-0.1.0", source: "SURVEY_ONLY", fields: ["summary", "coverage", "limitation", "provenance"], requiresDestinationConfirmation: true, disclaimer: "NOT_A_DIAGNOSIS" };
}

export function resolveDeletionResult(deletedEntities: number, failedEntities: number): DeletionResult {
  if (failedEntities > 0 && deletedEntities > 0) return "PARTIALLY_DELETED";
  if (failedEntities > 0) return "FAILED";
  return "DELETED";
}
