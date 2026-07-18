export const ENTERPRISE_DEMO_HASH = "enterprise-demo/overview";

export function isEnterpriseDemoMode(argv: readonly string[] = process.argv, env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return argv.includes("--enterprise-demo") || argv.includes("--enterprise-demo-validate") || env.EYEMATE_ENTERPRISE_DEMO === "1";
}

export function isEnterpriseDemoValidationMode(argv: readonly string[] = process.argv): boolean {
  return argv.includes("--enterprise-demo-validate");
}

export function shouldInitializePersonalStorage(enterpriseDemoMode: boolean): boolean {
  return !enterpriseDemoMode;
}
