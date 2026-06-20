export type ConsumerSnippetInput = {
  agentId: string;
  platformUrl: string;
  isPaid: boolean;
  pricePerCall: string;
  isVerified: boolean;
};

export function buildInstallSnippet(): string {
  return `pip install -e .
# run from the InferNet repo root (or your fork)`;
}

export function buildEnvSnippet({ platformUrl, isPaid }: ConsumerSnippetInput): string {
  const lines = [
    "# macOS / Linux",
    `export INFERNET_PLATFORM_URL=${platformUrl}`,
  ];

  if (isPaid) {
    lines.push("export PAYER_PRIVATE_KEY=0xYourKey  # pays INFR per call");
  }

  lines.push("", "# Windows");
  lines.push(`set INFERNET_PLATFORM_URL=${platformUrl}`);

  if (isPaid) {
    lines.push("set PAYER_PRIVATE_KEY=0xYourKey");
  }

  return lines.join("\n");
}

export function buildPythonSnippet(input: ConsumerSnippetInput): string {
  const { agentId, platformUrl, isPaid, isVerified } = input;

  const clientArgs = [
    "    AGENT_ID,",
    `    platform_url="${platformUrl}",`,
  ];

  if (isVerified) {
    clientArgs.push("    verify_erc8004=True,");
  }

  const inferArgs = ['    "Your task here",', "    max_tokens=512,"];

  if (isPaid) {
    inferArgs.push("    auto_pay=True,  # requires PAYER_PRIVATE_KEY");
  }

  return `"""Call agent "${agentId}" from your Python project."""
from infernet import Client

AGENT_ID = "${agentId}"

client = Client.from_agent(
${clientArgs.join("\n")}
)

result = client.infer(
${inferArgs.join("\n")}
)

print(result.output)`;
}

export function buildCliSnippet({ agentId, platformUrl }: ConsumerSnippetInput): string {
  return `infernet call ${agentId} \\
  --task "Your task here" \\
  --platform-url ${platformUrl} \\
  --max-tokens 512`;
}

export function buildFullSetupSnippet(input: ConsumerSnippetInput): string {
  return [
    "# 1. Install",
    buildInstallSnippet(),
    "",
    "# 2. Environment",
    buildEnvSnippet(input),
    "",
    "# 3. Python",
    buildPythonSnippet(input),
  ].join("\n");
}
