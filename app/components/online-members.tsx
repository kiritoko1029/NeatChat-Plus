import { useEffect, useState } from "react";
import styles from "./home.module.scss";
import UserIcon from "../icons/user.svg";
import { useServerConfigStore } from "../store/config/client-config";

// 本地存储密钥
const LOCAL_STORAGE_CLIENT_ID_KEY = "online_client_id";
const LOCAL_STORAGE_FINGERPRINT_KEY = "browser_fingerprint";

// 生成简单的浏览器指纹
function generateBrowserFingerprint(): string {
  if (typeof window === "undefined") return "";

  // 收集浏览器信息
  const info = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    !!navigator.cookieEnabled,
    typeof navigator.hardwareConcurrency !== "undefined"
      ? navigator.hardwareConcurrency
      : "",
    typeof (navigator as any).deviceMemory !== "undefined"
      ? (navigator as any).deviceMemory
      : "",
    typeof window.indexedDB !== "undefined",
    typeof window.sessionStorage !== "undefined",
    typeof window.localStorage !== "undefined",
    typeof window.openDatabase !== "undefined",
    navigator.vendor || "",
  ].join("###");

  // 创建哈希
  let hash = 0;
  for (let i = 0; i < info.length; i++) {
    const char = info.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }

  // 转换为字符串并返回
  return Math.abs(hash).toString(36);
}

// 获取或生成浏览器指纹
function getBrowserFingerprint(): string {
  if (typeof window === "undefined") return "";

  let fingerprint = localStorage.getItem(LOCAL_STORAGE_FINGERPRINT_KEY);
  if (!fingerprint) {
    fingerprint = generateBrowserFingerprint();
    localStorage.setItem(LOCAL_STORAGE_FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

export function OnlineMembers() {
  const [count, setCount] = useState<number>(0);
  const [clientId, setClientId] = useState<string>(() => {
    // 初始化时从localStorage获取客户端ID
    if (typeof window !== "undefined") {
      return localStorage.getItem(LOCAL_STORAGE_CLIENT_ID_KEY) || "";
    }
    return "";
  });
  const [fingerprint, setFingerprint] = useState<string>("");
  const serverConfig = useServerConfigStore((state) => state.serverConfig);
  const [enabled, setEnabled] = useState<boolean>(
    serverConfig.enableOnlineMember || false,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    // 避免在服务器端渲染时执行
    if (typeof window === "undefined") return;

    // 生成或获取浏览器指纹
    const browserFingerprint = getBrowserFingerprint();
    setFingerprint(browserFingerprint);

    // 避免重复初始化
    if (initialized) return;
    setInitialized(true);

    let timer: NodeJS.Timeout | null = null;

    // 轮询在线人数统计
    const pollOnlineCount = () => {
      // 使用浏览器指纹作为请求参数
      const url = `/api/online?${
        clientId ? `clientId=${clientId}&` : ""
      }fingerprint=${browserFingerprint}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.enabled) {
            setCount(data.count);

            // 如果服务器返回新的clientId，则保存它
            if (data.clientId && (!clientId || clientId !== data.clientId)) {
              setClientId(data.clientId);
              localStorage.setItem(LOCAL_STORAGE_CLIENT_ID_KEY, data.clientId);
            }

            setEnabled(true);
          } else {
            setEnabled(false);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("[OnlineMembers] Failed to fetch online count:", err);
          setLoading(false);
        });
    };

    // 使用全局状态中的配置
    const isEnabled = serverConfig.enableOnlineMember;
    setEnabled(isEnabled);

    if (!isEnabled) {
      setLoading(false);
      return;
    }

    // 如果启用了在线人数统计，立即进行第一次轮询
    pollOnlineCount();

    // 设置定时轮询
    timer = setInterval(pollOnlineCount, 30000); // 每30秒轮询一次

    // 清理函数
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [clientId, initialized, serverConfig.enableOnlineMember]);

  // 如果未启用或正在加载，不显示组件
  if (!enabled && !loading) {
    return null;
  }

  return (
    <div className={styles["online-members"]}>
      <UserIcon />
      <span className={styles["online-count"]}>
        {loading ? "加载中..." : `${count} 在线`}
      </span>
    </div>
  );
}
