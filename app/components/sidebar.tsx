import React, { useEffect, useRef, useMemo, useState, Fragment } from "react";

import styles from "./home.module.scss";

import { IconButton } from "./button";
import SettingsIcon from "../icons/settings.svg";
import GithubIcon from "../icons/github.svg";
import AddIcon from "../icons/add.svg";
import DeleteIcon from "../icons/delete.svg";
import MaskIcon from "../icons/mask.svg";
import DragIcon from "../icons/drag.svg";
import DiscoveryIcon from "../icons/discovery.svg";
import NeatIcon from "../icons/neat.svg";
import McpIcon from "../icons/mcp.svg";
import LoadingIcon from "../icons/three-dots.svg";

import Locale from "../locales";

import { useAppConfig, useChatStore } from "../store";

import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  NARROW_SIDEBAR_WIDTH,
  Path,
  PLUGINS,
  REPO_URL,
} from "../constant";

import { Link, useNavigate } from "react-router-dom";
import { isIOS, useMobileScreen } from "../utils";
import dynamic from "next/dynamic";
import { showConfirm, SimpleSelector } from "./ui-lib";
import clsx from "clsx";
import { isMcpEnabled, initializeMcpSystem } from "../mcp/actions";
import { OnlineMembers } from "./online-members";
import { useServerConfigStore } from "../store/config/client-config";

const ChatList = dynamic(async () => (await import("./chat-list")).ChatList, {
  loading: () => null,
});

const McpMarketPage = dynamic(
  async () => (await import("./mcp-market")).McpMarketPage,
  {
    loading: () => <Loading noLogo />,
  },
);

function Loading(props: { noLogo?: boolean }) {
  return (
    <div className="loading-content">
      <LoadingIcon />
    </div>
  );
}

export function useHotKey() {
  const chatStore = useChatStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey) {
        if (e.key === "ArrowUp") {
          chatStore.nextSession(-1);
        } else if (e.key === "ArrowDown") {
          chatStore.nextSession(1);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}

export function useDragSideBar() {
  const limit = (x: number) => Math.min(MAX_SIDEBAR_WIDTH, x);

  const config = useAppConfig();
  const startX = useRef(0);
  const startDragWidth = useRef(config.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
  const lastUpdateTime = useRef(Date.now());

  const toggleSideBar = () => {
    config.update((config) => {
      if (config.sidebarWidth < MIN_SIDEBAR_WIDTH) {
        config.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
      } else {
        config.sidebarWidth = NARROW_SIDEBAR_WIDTH;
      }
    });
  };

  const onDragStart = (e: MouseEvent) => {
    // Remembers the initial width each time the mouse is pressed
    startX.current = e.clientX;
    startDragWidth.current = config.sidebarWidth;
    const dragStartTime = Date.now();

    const handleDragMove = (e: MouseEvent) => {
      if (Date.now() < lastUpdateTime.current + 20) {
        return;
      }
      lastUpdateTime.current = Date.now();
      const d = e.clientX - startX.current;
      const nextWidth = limit(startDragWidth.current + d);
      config.update((config) => {
        if (nextWidth < MIN_SIDEBAR_WIDTH) {
          config.sidebarWidth = NARROW_SIDEBAR_WIDTH;
        } else {
          config.sidebarWidth = nextWidth;
        }
      });
    };

    const handleDragEnd = () => {
      // In useRef the data is non-responsive, so `config.sidebarWidth` can't get the dynamic sidebarWidth
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);

      // if user click the drag icon, should toggle the sidebar
      const shouldFireClick = Date.now() - dragStartTime < 300;
      if (shouldFireClick) {
        toggleSideBar();
      }
    };

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
  };

  const isMobileScreen = useMobileScreen();
  const shouldNarrow =
    !isMobileScreen && config.sidebarWidth < MIN_SIDEBAR_WIDTH;

  useEffect(() => {
    const barWidth = shouldNarrow
      ? NARROW_SIDEBAR_WIDTH
      : limit(config.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
    const sideBarWidth = isMobileScreen ? "100vw" : `${barWidth}px`;
    document.documentElement.style.setProperty("--sidebar-width", sideBarWidth);
  }, [config.sidebarWidth, isMobileScreen, shouldNarrow]);

  return {
    onDragStart,
    shouldNarrow,
  };
}
export function SideBarContainer(props: {
  children: React.ReactNode;
  onDragStart: (e: MouseEvent) => void;
  shouldNarrow: boolean;
  className?: string;
}) {
  const isMobileScreen = useMobileScreen();
  const isIOSMobile = useMemo(
    () => isIOS() && isMobileScreen,
    [isMobileScreen],
  );
  const { children, className, onDragStart, shouldNarrow } = props;
  return (
    <div
      className={clsx(styles.sidebar, className, {
        [styles["narrow-sidebar"]]: shouldNarrow,
      })}
      style={{
        // #3016 disable transition on ios mobile screen
        transition: isMobileScreen && isIOSMobile ? "none" : undefined,
      }}
    >
      {children}
      <div
        className={styles["sidebar-drag"]}
        onPointerDown={(e) => onDragStart(e as any)}
      >
        <DragIcon />
      </div>
    </div>
  );
}

export function SideBarHeader(props: {
  title?: string | React.ReactNode;
  subTitle?: string | React.ReactNode;
  logo?: React.ReactNode;
  children?: React.ReactNode;
  shouldNarrow?: boolean;
  onSubTitleClick?: () => void;
}) {
  const { title, subTitle, logo, children, shouldNarrow, onSubTitleClick } =
    props;
  return (
    <Fragment>
      <div
        className={clsx(styles["sidebar-header"], {
          [styles["sidebar-header-narrow"]]: shouldNarrow,
        })}
        data-tauri-drag-region
      >
        <div className={styles["sidebar-title-container"]}>
          <div
            className={clsx(styles["sidebar-title"], "logo-text")}
            data-tauri-drag-region
            style={{ visibility: "visible" }}
          >
            {title}
          </div>
          <OnlineMembers />
          <div
            className={clsx(styles["sidebar-sub-title"], {
              [styles["sidebar-sub-title-clickable"]]: !!onSubTitleClick,
            })}
            onClick={(e) => {
              // 如果用户正在选择文本，不触发点击事件
              if (window.getSelection()?.toString()) {
                return;
              }
              onSubTitleClick?.();
            }}
            title={onSubTitleClick ? "点击刷新" : undefined}
          >
            {subTitle}
          </div>
        </div>
        <div className={clsx(styles["sidebar-logo"], "no-dark")}>{logo}</div>
      </div>
      {children}
    </Fragment>
  );
}

export function SideBarBody(props: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}) {
  const { onClick, children } = props;
  return (
    <div className={styles["sidebar-body"]} onClick={onClick}>
      {children}
    </div>
  );
}

export function SideBarTail(props: {
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  const { primaryAction, secondaryAction } = props;

  return (
    <div className={styles["sidebar-tail"]}>
      <div className={styles["sidebar-actions"]}>{primaryAction}</div>
      <div className={styles["sidebar-actions"]}>{secondaryAction}</div>
    </div>
  );
}

export function SideBar(props: { className?: string }) {
  useHotKey();
  const { onDragStart, shouldNarrow } = useDragSideBar();
  const [showPluginSelector, setShowPluginSelector] = useState(false);
  const navigate = useNavigate();
  const config = useAppConfig();
  const chatStore = useChatStore();
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const serverConfig = useServerConfigStore((state) => state.serverConfig);
  const fetchServerConfig = useServerConfigStore((state) => state.fetchConfig);

  // 使用服务器配置初始化状态
  const [sideBarTitle, setSideBarTitle] = useState(
    serverConfig.sideBarTitle || "NeatChat",
  );
  const [sideBarSubTitle, setSideBarSubTitle] = useState<React.ReactNode>(
    "A Better AI assistant.",
  );
  const [hitokotoUrl, setHitokotoUrl] = useState(
    serverConfig.hitokotoUrl || "",
  );
  const [logoUrl, setLogoUrl] = useState(serverConfig.sideBarLogoUrl || "");

  // 自定义LOGO渲染组件
  const renderLogo = () => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt="Logo"
          width={44}
          height={44}
          style={{ objectFit: "contain" }}
        />
      );
    }
    return <NeatIcon width={44} height={44} />;
  };

  // 检查是否是有效的URL
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // 解析文本中的URL并转换为可点击的链接
  const parseTextWithUrls = (text: string): React.ReactNode => {
    // URL 正则表达式
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      // 检查是否是URL
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--primary)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation(); // 防止触发父元素的点击事件
            }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // 获取一言的函数
  const fetchHitokoto = (url: string) => {
    // 检查是否是URL格式
    try {
      new URL(url); // 尝试解析URL
      // 是URL格式，则请求API
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.hitokoto) {
            // 构建包含来源和作者的副标题
            let hitokotoText = data.hitokoto;
            if (data.from) {
              hitokotoText += ` —— ${data.from}`;
              if (data.from_who) {
                hitokotoText += `「${data.from_who}」`;
              }
            }
            // 解析文本中的URL并转换为可点击的链接
            const parsedSubTitle = parseTextWithUrls(hitokotoText);
            setSideBarSubTitle(parsedSubTitle);
            console.log("[SideBar] Hitokoto:", hitokotoText);
          }
        })
        .catch((err) => {
          console.error("[SideBar] Failed to fetch hitokoto:", err);
        });
    } catch (e) {
      // 不是URL格式，解析文本中的URL并转换为可点击的链接
      console.log("[SideBar] Hitokoto URL is not valid, using as text:", url);
      const parsedSubTitle = parseTextWithUrls(url);
      setSideBarSubTitle(parsedSubTitle);
    }
  };

  // 刷新一言的函数
  const refreshHitokoto = () => {
    if (hitokotoUrl && isValidUrl(hitokotoUrl)) {
      console.log("[SideBar] Refreshing hitokoto from:", hitokotoUrl);
      fetchHitokoto(hitokotoUrl);
    }
  };

  // 初始化配置和MCP
  useEffect(() => {
    // 使用服务器配置（已在 Home 组件中加载）
    fetchServerConfig().then((config) => {
      // 设置侧边栏标题
      if (config.sideBarTitle) {
        setSideBarTitle(config.sideBarTitle);
        console.log("[SideBar] Title:", config.sideBarTitle);
      }

      // 如果配置了一言API或文本，则处理并保存
      if (config.hitokotoUrl && config.hitokotoUrl.length > 0) {
        setHitokotoUrl(config.hitokotoUrl);
        fetchHitokoto(config.hitokotoUrl);
      }

      // 如果配置了LOGO URL，则保存
      if (config.sideBarLogoUrl && config.sideBarLogoUrl.length > 0) {
        setLogoUrl(config.sideBarLogoUrl);
        console.log("[SideBar] Logo URL:", config.sideBarLogoUrl);
      }
    });

    // 初始化MCP系统
    const initMcp = async () => {
      try {
        const enabled = await isMcpEnabled();
        setMcpEnabled(enabled);
        console.log("[SideBar] MCP enabled:", enabled);

        if (enabled) {
          console.log("[MCP] initializing...");
          await initializeMcpSystem();
          console.log("[MCP] initialized");
        }
      } catch (err) {
        console.error("[MCP] failed to initialize:", err);
      }
    };
    initMcp();
  }, [fetchServerConfig]);

  return (
    <SideBarContainer
      onDragStart={onDragStart}
      shouldNarrow={shouldNarrow}
      {...props}
    >
      <SideBarHeader
        title={sideBarTitle}
        subTitle={sideBarSubTitle}
        logo={renderLogo()}
        shouldNarrow={shouldNarrow}
        onSubTitleClick={
          hitokotoUrl && isValidUrl(hitokotoUrl) ? refreshHitokoto : undefined
        }
      >
        <div className={styles["sidebar-header-bar"]}>
          <IconButton
            icon={<MaskIcon />}
            text={shouldNarrow ? undefined : Locale.Mask.Name}
            className={styles["sidebar-bar-button"]}
            onClick={() => {
              if (config.dontShowMaskSplashScreen !== true) {
                navigate(Path.NewChat, { state: { fromHome: true } });
              } else {
                navigate(Path.Masks, { state: { fromHome: true } });
              }
            }}
            shadow
          />
          {mcpEnabled && (
            <IconButton
              icon={<McpIcon />}
              text={shouldNarrow ? undefined : Locale.Mcp.Name}
              className={styles["sidebar-bar-button"]}
              onClick={() => {
                navigate(Path.McpMarket, { state: { fromHome: true } });
              }}
              shadow
            />
          )}
          <IconButton
            icon={<DiscoveryIcon />}
            text={shouldNarrow ? undefined : Locale.Discovery.Name}
            className={styles["sidebar-bar-button"]}
            onClick={() => setShowPluginSelector(true)}
            shadow
          />
        </div>
        {showPluginSelector && (
          <SimpleSelector
            items={[
              ...PLUGINS.map((item) => {
                return {
                  title: item.name,
                  value: item.path,
                };
              }),
            ]}
            onClose={() => setShowPluginSelector(false)}
            onSelection={(s) => {
              navigate(s[0], { state: { fromHome: true } });
            }}
          />
        )}
      </SideBarHeader>
      <SideBarBody
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            navigate(Path.Home);
          }
        }}
      >
        <ChatList narrow={shouldNarrow} />
      </SideBarBody>
      <SideBarTail
        primaryAction={
          <>
            <div className={clsx(styles["sidebar-action"], styles.mobile)}>
              <IconButton
                icon={<DeleteIcon />}
                onClick={async () => {
                  if (await showConfirm(Locale.Home.DeleteChat)) {
                    chatStore.deleteSession(chatStore.currentSessionIndex);
                  }
                }}
              />
            </div>
            <div className={styles["sidebar-action"]}>
              <Link to={Path.Settings}>
                <IconButton
                  aria={Locale.Settings.Title}
                  icon={<SettingsIcon />}
                  shadow
                />
              </Link>
            </div>
            <div className={styles["sidebar-action"]}>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                <IconButton
                  aria={Locale.Export.MessageFromChatGPT}
                  icon={<GithubIcon />}
                  shadow
                />
              </a>
            </div>
          </>
        }
        secondaryAction={
          <IconButton
            icon={<AddIcon />}
            text={shouldNarrow ? undefined : Locale.Home.NewChat}
            onClick={() => {
              if (config.dontShowMaskSplashScreen) {
                chatStore.newSession();
                navigate(Path.Chat);
              } else {
                navigate(Path.NewChat);
              }
            }}
            shadow
          />
        }
      />
    </SideBarContainer>
  );
}
