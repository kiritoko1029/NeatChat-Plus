import { NextResponse } from "next/server";

import { getServerSideConfig } from "../../config/server";

const serverConfig = getServerSideConfig();

// Danger! Do not hard code any secret value here!
// 警告！不要在这里写入任何敏感信息！
const DANGER_CONFIG = {
  needCode: serverConfig.needCode,
  hideUserApiKey: serverConfig.hideUserApiKey,
  disableGPT4: serverConfig.disableGPT4,
  hideBalanceQuery: serverConfig.hideBalanceQuery,
  disableFastLink: serverConfig.disableFastLink,
  customModels: serverConfig.customModels || process.env.CUSTOM_MODELS || "",
  defaultModel: serverConfig.defaultModel,
  baseUrl: process.env.BASE_URL || "https://api.openai.com",
  apiKey: process.env.OPENAI_API_KEY ? "已设置" : "",
  sideBarTitle: process.env.SIDE_BAR_TITLE || "NeatChat",
  hitokotoUrl: process.env.HITOKOTO_URL || "",
  sideBarLogoUrl: process.env.SIDE_BAR_LOGO_URL || "",
  enableOnlineMember: serverConfig.enableOnlineMember || false,
};

declare global {
  type DangerConfig = typeof DANGER_CONFIG;
}

async function handle() {
  return NextResponse.json(DANGER_CONFIG);
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
