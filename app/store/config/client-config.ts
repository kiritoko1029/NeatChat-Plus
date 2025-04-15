import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ServerConfig {
  needCode: boolean;
  hideUserApiKey: boolean;
  disableGPT4: boolean;
  hideBalanceQuery: boolean;
  disableFastLink: boolean;
  customModels: string;
  defaultModel: string;
  baseUrl: string;
  apiKey: string;
  sideBarTitle: string;
  hitokotoUrl: string;
  sideBarLogoUrl: string;
  enableOnlineMember: boolean;
}

// 默认值
const DEFAULT_CONFIG: ServerConfig = {
  needCode: false,
  hideUserApiKey: false,
  disableGPT4: false,
  hideBalanceQuery: false,
  disableFastLink: false,
  customModels: "",
  defaultModel: "",
  baseUrl: "https://api.openai.com",
  apiKey: "",
  sideBarTitle: "NeatChat",
  hitokotoUrl: "",
  sideBarLogoUrl: "",
  enableOnlineMember: false,
};

interface ServerConfigState {
  serverConfig: ServerConfig;
  lastUpdateTime: number; // 最后更新时间戳
  isFetching: boolean; // 是否正在获取配置
  isInitialized: boolean; // 是否已初始化

  // 获取服务器配置（如果缓存过期或强制刷新）
  fetchConfig: (force?: boolean) => Promise<ServerConfig>;
}

// 缓存有效期（5分钟）
const CACHE_EXPIRATION = 5 * 60 * 1000;

export const useServerConfigStore = create<ServerConfigState>()(
  persist(
    (set, get) => ({
      serverConfig: DEFAULT_CONFIG,
      lastUpdateTime: 0,
      isFetching: false,
      isInitialized: false,

      fetchConfig: async (force = false) => {
        // 如果已经在获取中，返回当前配置
        if (get().isFetching) {
          return get().serverConfig;
        }

        const now = Date.now();
        const { lastUpdateTime, serverConfig, isInitialized } = get();

        // 如果缓存未过期且不是强制刷新，直接返回缓存的配置
        if (
          isInitialized &&
          !force &&
          now - lastUpdateTime < CACHE_EXPIRATION
        ) {
          console.log(
            "[ServerConfig] Using cached config, age:",
            (now - lastUpdateTime) / 1000,
            "s",
          );
          return serverConfig;
        }

        // 开始获取配置
        set({ isFetching: true });

        try {
          console.log("[ServerConfig] Fetching config from server...");
          const response = await fetch("/api/config");
          const data = await response.json();

          set({
            serverConfig: data,
            lastUpdateTime: now,
            isInitialized: true,
            isFetching: false,
          });

          console.log("[ServerConfig] Config updated:", data);
          return data;
        } catch (error) {
          console.error("[ServerConfig] Failed to fetch config:", error);
          set({ isFetching: false });

          // 如果请求失败但已有缓存，返回缓存
          if (isInitialized) {
            return serverConfig;
          }

          // 否则返回默认配置
          return DEFAULT_CONFIG;
        }
      },
    }),
    {
      name: "server-config-storage",
      version: 1,
      // 只持久化配置数据和上次更新时间
      partialize: (state) => ({
        serverConfig: state.serverConfig,
        lastUpdateTime: state.lastUpdateTime,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);
