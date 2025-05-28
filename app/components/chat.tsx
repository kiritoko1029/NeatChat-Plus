import { useDebouncedCallback } from "use-debounce";
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  Fragment,
  RefObject,
} from "react";

import SendWhiteIcon from "../icons/send-white.svg";
import BrainIcon from "../icons/brain.svg";
import WebSearchIcon from "../icons/web-search.svg"; // 新增图标导入
import RenameIcon from "../icons/rename.svg";
import ExportIcon from "../icons/share.svg";
import ReturnIcon from "../icons/return.svg";
import CopyIcon from "../icons/copy.svg";
import SpeakIcon from "../icons/speak.svg";
import SpeakStopIcon from "../icons/speak-stop.svg";
import LoadingIcon from "../icons/three-dots.svg";
import LoadingButtonIcon from "../icons/loading.svg";
import PromptIcon from "../icons/prompt.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import ResetIcon from "../icons/reload.svg";
import BreakIcon from "../icons/break.svg";
import SettingsIcon from "../icons/chat-settings.svg";
import DeleteIcon from "../icons/clear.svg";
import PinIcon from "../icons/pin.svg";
import EditIcon from "../icons/rename.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";
import FileIcon from "../icons/file.svg";
import AttachmentIcon from "../icons/attachment.svg";

import LightIcon from "../icons/light.svg";
import DarkIcon from "../icons/dark.svg";
import AutoIcon from "../icons/auto.svg";
import BottomIcon from "../icons/bottom.svg";
import StopIcon from "../icons/pause.svg";
import RobotIcon from "../icons/robot.svg";
import SizeIcon from "../icons/size.svg";
import QualityIcon from "../icons/hd.svg";
import StyleIcon from "../icons/palette.svg";
import PluginIcon from "../icons/plugin.svg";
import ShortcutkeyIcon from "../icons/shortcutkey.svg";
import ReloadIcon from "../icons/reload.svg";
import HeadphoneIcon from "../icons/headphone.svg";
import McpToolIcon from "../icons/tool.svg";
import {
  ChatMessage,
  SubmitKey,
  useChatStore,
  BOT_HELLO,
  createMessage,
  useAccessStore,
  Theme,
  useAppConfig,
  DEFAULT_TOPIC,
  ModelType,
  usePluginStore,
} from "../store";

import {
  copyToClipboard,
  selectOrCopy,
  autoGrowTextArea,
  useMobileScreen,
  getMessageTextContent,
  getMessageTextContentForDisplay,
  getMessageImages,
  isVisionModel,
  isDalle3,
  showPlugins,
  safeLocalStorage,
} from "../utils";

import { uploadImage as uploadImageRemote } from "@/app/utils/chat";

import dynamic from "next/dynamic";

import { ChatControllerPool } from "../client/controller";
import { DalleSize, DalleQuality, DalleStyle } from "../typing";
import { Prompt, usePromptStore } from "../store/prompt";
import Locale from "../locales";

import { IconButton } from "./button";
import styles from "./chat.module.scss";

import {
  List,
  ListItem,
  Modal,
  Selector,
  showConfirm,
  showPrompt,
  showToast,
  SimpleMultipleSelector,
} from "./ui-lib";
import { useNavigate } from "react-router-dom";
import {
  CHAT_PAGE_SIZE,
  DEFAULT_TTS_ENGINE,
  ModelProvider,
  Path,
  REQUEST_TIMEOUT_MS,
  UNFINISHED_INPUT,
  ServiceProvider,
} from "../constant";
import { Avatar } from "./emoji";
import { ContextPrompts, MaskAvatar, MaskConfig } from "./mask";
import { useMaskStore } from "../store/mask";
import { useChatCommand, useCommand } from "../command";
import { prettyObject } from "../utils/format";
import { ExportMessageModal } from "./exporter";
import { getClientConfig } from "../config/client";
import { useAllModels } from "../utils/hooks";
import { MultimodalContent } from "../client/api";

import { ClientApi } from "../client/api";
import { createTTSPlayer } from "../utils/audio";
import { MsEdgeTTS, OUTPUT_FORMAT } from "../utils/ms_edge_tts";

import { isEmpty } from "lodash-es";
import { getModelProvider } from "../utils/model";
import { RealtimeChat } from "@/app/components/realtime-chat";
import clsx from "clsx";
import {
  FileInfo,
  getFileIconClass,
  uploadAttachments,
  readFileAsText,
} from "../utils/file";
import {
  getAvailableClientsCount,
  isMcpEnabled,
  getAllTools,
} from "../mcp/actions";

import { ImageEditor } from "./image-editor";
import CloseIcon from "../icons/close.svg";

const localStorage = safeLocalStorage();

const ttsPlayer = createTTSPlayer();

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

export function SessionConfigModel(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const maskStore = useMaskStore();
  const navigate = useNavigate();

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Context.Edit}
        onClose={() => props.onClose()}
        actions={[
          <IconButton
            key="reset"
            icon={<ResetIcon />}
            bordered
            text={Locale.Chat.Config.Reset}
            onClick={async () => {
              if (await showConfirm(Locale.Memory.ResetConfirm)) {
                chatStore.updateTargetSession(
                  session,
                  (session) => (session.memoryPrompt = ""),
                );
              }
            }}
          />,
          <IconButton
            key="copy"
            icon={<CopyIcon />}
            bordered
            text={Locale.Chat.Config.SaveAs}
            onClick={() => {
              navigate(Path.Masks);
              setTimeout(() => {
                maskStore.create(session.mask);
              }, 500);
            }}
          />,
        ]}
      >
        <MaskConfig
          mask={session.mask}
          updateMask={(updater) => {
            const mask = { ...session.mask };
            updater(mask);
            chatStore.updateTargetSession(
              session,
              (session) => (session.mask = mask),
            );
          }}
          shouldSyncFromGlobal
          extraListItems={
            session.mask.modelConfig.sendMemory ? (
              <ListItem
                className="copyable"
                title={`${Locale.Memory.Title} (${session.lastSummarizeIndex} of ${session.messages.length})`}
                subTitle={session.memoryPrompt || Locale.Memory.EmptyContent}
              ></ListItem>
            ) : (
              <></>
            )
          }
        ></MaskConfig>
      </Modal>
    </div>
  );
}

function PromptToast(props: {
  showToast?: boolean;
  showModal?: boolean;
  setShowModal: (_: boolean) => void;
}) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const context = session.mask.context;

  return (
    <div className={styles["prompt-toast"]} key="prompt-toast">
      {props.showToast && context.length > 0 && (
        <div
          className={clsx(styles["prompt-toast-inner"], "clickable")}
          role="button"
          onClick={() => props.setShowModal(true)}
        >
          <BrainIcon />
          <span className={styles["prompt-toast-content"]}>
            {Locale.Context.Toast(context.length)}
          </span>
        </div>
      )}
      {props.showModal && (
        <SessionConfigModel onClose={() => props.setShowModal(false)} />
      )}
    </div>
  );
}

function useSubmitHandler() {
  const config = useAppConfig();
  const submitKey = config.submitKey;
  const isComposing = useRef(false);

  useEffect(() => {
    const onCompositionStart = () => {
      isComposing.current = true;
    };
    const onCompositionEnd = () => {
      isComposing.current = false;
    };

    window.addEventListener("compositionstart", onCompositionStart);
    window.addEventListener("compositionend", onCompositionEnd);

    return () => {
      window.removeEventListener("compositionstart", onCompositionStart);
      window.removeEventListener("compositionend", onCompositionEnd);
    };
  }, []);

  const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Fix Chinese input method "Enter" on Safari
    if (e.keyCode == 229) return false;
    if (e.key !== "Enter") return false;
    if (e.key === "Enter" && (e.nativeEvent.isComposing || isComposing.current))
      return false;
    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

export type RenderPrompt = Pick<Prompt, "title" | "content">;

export function PromptHints(props: {
  prompts: RenderPrompt[];
  onPromptSelect: (prompt: RenderPrompt) => void;
}) {
  const noPrompts = props.prompts.length === 0;
  const [selectIndex, setSelectIndex] = useState(0);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectIndex(0);
  }, [props.prompts.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (noPrompts || e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }
      // arrow up / down to select prompt
      const changeIndex = (delta: number) => {
        e.stopPropagation();
        e.preventDefault();
        const nextIndex = Math.max(
          0,
          Math.min(props.prompts.length - 1, selectIndex + delta),
        );
        setSelectIndex(nextIndex);
        selectedRef.current?.scrollIntoView({
          block: "center",
        });
      };

      if (e.key === "ArrowUp") {
        changeIndex(1);
      } else if (e.key === "ArrowDown") {
        changeIndex(-1);
      } else if (e.key === "Enter") {
        const selectedPrompt = props.prompts.at(selectIndex);
        if (selectedPrompt) {
          props.onPromptSelect(selectedPrompt);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.prompts.length, selectIndex]);

  if (noPrompts) return null;
  return (
    <div className={styles["prompt-hints"]}>
      {props.prompts.map((prompt, i) => (
        <div
          ref={i === selectIndex ? selectedRef : null}
          className={clsx(styles["prompt-hint"], {
            [styles["prompt-hint-selected"]]: i === selectIndex,
          })}
          key={prompt.title + i.toString()}
          onClick={() => props.onPromptSelect(prompt)}
          onMouseEnter={() => setSelectIndex(i)}
        >
          <div className={styles["hint-title"]}>{prompt.title}</div>
          <div className={styles["hint-content"]}>{prompt.content}</div>
        </div>
      ))}
    </div>
  );
}

function ClearContextDivider() {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();

  return (
    <div
      className={styles["clear-context"]}
      onClick={() =>
        chatStore.updateTargetSession(
          session,
          (session) => (session.clearContextIndex = undefined),
        )
      }
    >
      <div className={styles["clear-context-tips"]}>{Locale.Context.Clear}</div>
      <div className={styles["clear-context-revert-btn"]}>
        {Locale.Context.Revert}
      </div>
    </div>
  );
}

export function ChatAction(props: {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState({
    full: 16,
    icon: 16,
  });

  function updateWidth() {
    if (!iconRef.current || !textRef.current) return;
    const getWidth = (dom: HTMLDivElement) => dom.getBoundingClientRect().width;
    const textWidth = getWidth(textRef.current);
    const iconWidth = getWidth(iconRef.current);
    setWidth({
      full: textWidth + iconWidth,
      icon: iconWidth,
    });
  }

  return (
    <div
      className={clsx(styles["chat-input-action"], "clickable", {
        [styles["active"]]: props.active,
        [styles["disabled"]]: props.disabled,
      })}
      onClick={() => {
        if (!props.disabled) {
          props.onClick();
          setTimeout(updateWidth, 1);
        }
      }}
      onMouseEnter={updateWidth}
      onTouchStart={updateWidth}
      style={
        {
          "--icon-width": `${width.icon}px`,
          "--full-width": `${width.full}px`,
        } as React.CSSProperties
      }
    >
      <div ref={iconRef} className={styles["icon"]}>
        {props.icon}
      </div>
      <div className={styles["text"]} ref={textRef}>
        {props.text}
      </div>
    </div>
  );
}

function useScrollToBottom(
  scrollRef: RefObject<HTMLDivElement>,
  detach: boolean = false,
) {
  // for auto-scroll

  const [autoScroll, setAutoScroll] = useState(true);
  function scrollDomToBottom() {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }

  // auto scroll
  useEffect(() => {
    if (autoScroll && !detach) {
      scrollDomToBottom();
    }
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}

export function ChatActions(props: {
  uploadAttachments: () => void;
  setAttachImages: (images: string[]) => void;
  setUploading: (uploading: boolean) => void;
  showPromptModal: () => void;
  scrollToBottom: () => void;
  showPromptHints: () => void;
  hitBottom: boolean;
  uploading: boolean;
  setShowShortcutKeyModal: React.Dispatch<React.SetStateAction<boolean>>;
  setUserInput: (input: string) => void;
  setShowChatSidePanel: React.Dispatch<React.SetStateAction<boolean>>;
  showMcpToolPanel: () => void;
  showWebSearchConfig: () => void;
}) {
  const config = useAppConfig();
  const navigate = useNavigate();
  const chatStore = useChatStore();
  const pluginStore = usePluginStore();
  const session = chatStore.currentSession();

  // switch themes
  const theme = config.theme;
  function nextTheme() {
    const themes = [Theme.Auto, Theme.Light, Theme.Dark];
    const themeIndex = themes.indexOf(theme);
    const nextIndex = (themeIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    config.update((config) => (config.theme = nextTheme));
  }

  // stop all responses
  const couldStop = ChatControllerPool.hasPending();
  const stopAll = () => ChatControllerPool.stopAll();

  // switch model
  const currentModel = session.mask.modelConfig.model;
  const currentProviderName =
    session.mask.modelConfig?.providerName || ServiceProvider.OpenAI;
  const allModels = useAllModels();
  const models = useMemo(() => {
    return allModels.filter((m) => m.available);
  }, [allModels]);
  const currentModelName = useMemo(() => {
    const model = models.find(
      (m) =>
        m.name == currentModel &&
        m?.provider?.providerName == currentProviderName,
    );
    return model?.displayName ?? "";
  }, [models, currentModel, currentProviderName]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showPluginSelector, setShowPluginSelector] = useState(false);
  const [showUploadImage, setShowUploadImage] = useState(false);

  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const dalle3Sizes: DalleSize[] = ["1024x1024", "1792x1024", "1024x1792"];
  const dalle3Qualitys: DalleQuality[] = ["standard", "hd"];
  const dalle3Styles: DalleStyle[] = ["vivid", "natural"];
  const currentSize = session.mask.modelConfig?.size ?? "1024x1024";
  const currentQuality = session.mask.modelConfig?.quality ?? "standard";
  const currentStyle = session.mask.modelConfig?.style ?? "vivid";

  const isMobileScreen = useMobileScreen();

  useEffect(() => {
    const show = isVisionModel(currentModel);
    setShowUploadImage(show);
    if (!show) {
      props.setAttachImages([]);
      props.setUploading(false);
    }

    // if current model is not available
    // switch to first available model
    const isUnavailableModel = !models.some((m) => m.name === currentModel);
    if (isUnavailableModel && models.length > 0) {
      // show next model to default model if exist
      let nextModel = models.find((model) => model.isDefault) || models[0];
      chatStore.updateTargetSession(session, (session) => {
        session.mask.modelConfig.model = nextModel.name;
        session.mask.modelConfig.providerName = nextModel?.provider
          ?.providerName as ServiceProvider;
      });
      showToast(
        nextModel?.provider?.providerName == "ByteDance"
          ? nextModel.displayName
          : nextModel.name,
      );
    }
  }, [chatStore, currentModel, models, session]);

  const showModelSearchOption = config.enableModelSearch ?? false;

  // 添加MCP工具按钮相关逻辑
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpToolsCount, setMcpToolsCount] = useState(0);

  // 检查MCP是否启用及工具数量
  useEffect(() => {
    const checkMcpStatus = async () => {
      try {
        const enabled = await isMcpEnabled();
        setMcpEnabled(enabled);
        if (enabled) {
          const count = await getAvailableClientsCount();
          setMcpToolsCount(count);
        }
      } catch (error) {
        console.error("Failed to check MCP status:", error);
      }
    };

    checkMcpStatus();
  }, []);

  return (
    <div className={styles["chat-input-actions"]}>
      <>
        {couldStop && (
          <ChatAction
            onClick={stopAll}
            text={Locale.Chat.InputActions.Stop}
            icon={<StopIcon />}
          />
        )}
        {!props.hitBottom && (
          <ChatAction
            onClick={props.scrollToBottom}
            text={Locale.Chat.InputActions.ToBottom}
            icon={<BottomIcon />}
          />
        )}
        {props.hitBottom && (
          <ChatAction
            onClick={props.showPromptModal}
            text={Locale.Chat.InputActions.Settings}
            icon={<SettingsIcon />}
          />
        )}

        <ChatAction
          onClick={props.uploadAttachments}
          text={Locale.Chat.InputActions.UploadAttachment}
          icon={props.uploading ? <LoadingButtonIcon /> : <AttachmentIcon />}
          disabled={props.uploading}
        />

        {config.enableThemeChange && (
          <ChatAction
            onClick={nextTheme}
            text={Locale.Chat.InputActions.Theme[theme]}
            icon={
              <>
                {theme === Theme.Auto ? (
                  <AutoIcon />
                ) : theme === Theme.Light ? (
                  <LightIcon />
                ) : theme === Theme.Dark ? (
                  <DarkIcon />
                ) : null}
              </>
            }
          />
        )}

        {config.enablePromptHints && (
          <ChatAction
            onClick={props.showPromptHints}
            text={Locale.Chat.InputActions.Prompt}
            icon={<PromptIcon />}
          />
        )}

        {config.enableClearContext && (
          <ChatAction
            text={Locale.Chat.InputActions.Clear}
            icon={<BreakIcon />}
            active={session.clearContextIndex !== undefined}
            onClick={() => {
              chatStore.updateTargetSession(session, (session) => {
                if (session.clearContextIndex === session.messages.length) {
                  session.clearContextIndex = undefined;
                } else {
                  session.clearContextIndex = session.messages.length;
                  session.memoryPrompt = ""; // will clear memory
                }
              });
            }}
          />
        )}

        <ChatAction
          onClick={() => setShowModelSelector(true)}
          text={currentModelName}
          icon={<RobotIcon />}
        />

        {showModelSelector && (
          <Selector
            defaultSelectedValue={`${currentModel}@${currentProviderName}`}
            items={models.map((m) => ({
              title: `${m.displayName}${
                m?.provider?.providerName
                  ? " (" + m?.provider?.providerName + ")"
                  : ""
              }`,
              value: `${m.name}@${m?.provider?.providerName}`,
              icon: (
                <Avatar model={m.name} provider={m?.provider?.providerName} />
              ),
            }))}
            onClose={() => setShowModelSelector(false)}
            onSelection={(m) => {
              if (m.length === 0) return;
              const [model, providerName] = getModelProvider(m[0]);
              chatStore.updateTargetSession(session, (session) => {
                session.mask.modelConfig.model = model as ModelType;
                session.mask.modelConfig.providerName =
                  providerName as ServiceProvider;
                session.mask.syncGlobalConfig = false;
                // 如果切换到非 gemini-2.0-flash-exp 模型，清除插件选择
                if (model !== "gemini-2.0-flash-exp") {
                  session.mask.plugin = [];
                }
              });
              showToast(model);
            }}
            showSearch={config.enableModelSearch ?? false}
          />
        )}

        {isDalle3(currentModel) && (
          <ChatAction
            onClick={() => setShowSizeSelector(true)}
            text={currentSize}
            icon={<SizeIcon />}
          />
        )}

        {showSizeSelector && (
          <Selector
            defaultSelectedValue={currentSize}
            items={dalle3Sizes.map((m) => ({
              title: m,
              value: m,
            }))}
            onClose={() => setShowSizeSelector(false)}
            onSelection={(s) => {
              if (s.length === 0) return;
              const size = s[0];
              chatStore.updateTargetSession(session, (session) => {
                session.mask.modelConfig.size = size;
              });
              showToast(size);
            }}
            showSearch={false}
          />
        )}

        {isDalle3(currentModel) && (
          <ChatAction
            onClick={() => setShowQualitySelector(true)}
            text={currentQuality}
            icon={<QualityIcon />}
          />
        )}

        {showQualitySelector && (
          <Selector
            defaultSelectedValue={currentQuality}
            items={dalle3Qualitys.map((m) => ({
              title: m,
              value: m,
            }))}
            onClose={() => setShowQualitySelector(false)}
            onSelection={(q) => {
              if (q.length === 0) return;
              const quality = q[0];
              chatStore.updateTargetSession(session, (session) => {
                session.mask.modelConfig.quality = quality;
              });
              showToast(quality);
            }}
            showSearch={false}
          />
        )}

        {isDalle3(currentModel) && (
          <ChatAction
            onClick={() => setShowStyleSelector(true)}
            text={currentStyle}
            icon={<StyleIcon />}
          />
        )}

        {showStyleSelector && (
          <Selector
            defaultSelectedValue={currentStyle}
            items={dalle3Styles.map((m) => ({
              title: m,
              value: m,
            }))}
            onClose={() => setShowStyleSelector(false)}
            onSelection={(s) => {
              if (s.length === 0) return;
              const style = s[0];
              chatStore.updateTargetSession(session, (session) => {
                session.mask.modelConfig.style = style;
              });
              showToast(style);
            }}
            showSearch={false}
          />
        )}

        {showPlugins(currentProviderName, currentModel) && (
          <ChatAction
            onClick={() => {
              if (currentModel === "gemini-2.0-flash-exp") {
                setShowPluginSelector(true);
              } else if (pluginStore.getAll().length === 0) {
                navigate(Path.Plugins);
              } else {
                setShowPluginSelector(true);
              }
            }}
            text={Locale.Plugin.Name}
            icon={<PluginIcon />}
            active={session.mask.plugin && session.mask.plugin.length > 0}
          />
        )}
        {showPluginSelector && (
          <SimpleMultipleSelector
            items={[
              ...(currentModel === "gemini-2.0-flash-exp"
                ? [
                    {
                      title: Locale.Plugin.EnableWeb,
                      value: "googleSearch",
                    },
                  ]
                : []),
              ...pluginStore.getAll().map((item) => ({
                title: `${item?.title}@${item?.version}`,
                value: item?.id,
              })),
            ]}
            defaultSelectedValue={chatStore.currentSession().mask?.plugin}
            onClose={() => setShowPluginSelector(false)}
            onSelection={(s) => {
              chatStore.updateTargetSession(session, (session) => {
                session.mask.plugin = s;
              });
            }}
            showSearch={false}
          />
        )}

        {mcpEnabled && (
          <ChatAction
            onClick={props.showMcpToolPanel}
            text={Locale.Chat.McpTools.ToolCount(mcpToolsCount)}
            icon={<McpToolIcon />}
            active={mcpToolsCount > 0}
          />
        )}

        {!isMobileScreen && config.enableShortcuts && (
          <ChatAction
            onClick={() => props.setShowShortcutKeyModal(true)}
            text={Locale.Chat.ShortcutKey.Title}
            icon={<ShortcutkeyIcon />}
          />
        )}
        {/* 添加网络搜索按钮 */}
        <ChatAction
          onClick={() => props.showWebSearchConfig()}
          text={
            config.webSearchConfig.enable
              ? Locale.Chat.WebSearch.Enabled
              : Locale.Chat.InputActions.Search
          }
          icon={<WebSearchIcon />}
          active={config.webSearchConfig.enable}
        />
      </>
      <div className={styles["chat-input-actions-end"]}>
        {config.realtimeConfig.enable && (
          <ChatAction
            onClick={() => props.setShowChatSidePanel(true)}
            text={"Realtime Chat"}
            icon={<HeadphoneIcon />}
          />
        )}
      </div>
    </div>
  );
}

export function EditMessageModal(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const [messages, setMessages] = useState(session.messages.slice());

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.EditMessage.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            text={Locale.UI.Cancel}
            icon={<CancelIcon />}
            key="cancel"
            onClick={() => {
              props.onClose();
            }}
          />,
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {
              chatStore.updateTargetSession(
                session,
                (session) => (session.messages = messages),
              );
              props.onClose();
            }}
          />,
        ]}
      >
        <List>
          <ListItem
            title={Locale.Chat.EditMessage.Topic.Title}
            subTitle={Locale.Chat.EditMessage.Topic.SubTitle}
          >
            <input
              type="text"
              value={session.topic}
              onInput={(e) =>
                chatStore.updateTargetSession(
                  session,
                  (session) => (session.topic = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </List>
        <ContextPrompts
          context={messages}
          updateContext={(updater) => {
            const newMessages = messages.slice();
            updater(newMessages);
            setMessages(newMessages);
          }}
        />
      </Modal>
    </div>
  );
}

export function DeleteImageButton(props: { deleteImage: (e?: any) => void }) {
  return (
    <div className={styles["delete-image"]} onClick={props.deleteImage}>
      <DeleteIcon />
    </div>
  );
}

export function WebSearchConfigModal(props: { onClose: () => void }) {
  const config = useAppConfig();
  const [tempConfig, setTempConfig] = useState({
    enable: config.webSearchConfig.enable,
    maxResults: config.webSearchConfig.maxResults,
    aiGenerateKeywords: config.webSearchConfig.aiGenerateKeywords,
    defaultCollapsed: config.webSearchConfig.defaultCollapsed,
    searxngUrl: config.webSearchConfig.searxngUrl,
  });
  const [envSearxngUrl, setEnvSearxngUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取服务端SEARXNG_URL配置状态
  useEffect(() => {
    const fetchEnvConfig = async () => {
      try {
        const response = await fetch("/api/env-config");
        if (response.ok) {
          const data = await response.json();
          setEnvSearxngUrl(data.searxngUrl || null);
        }
      } catch (error) {
        console.error("获取环境配置失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnvConfig();
  }, []);

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.WebSearch.ConfigTitle}
        onClose={props.onClose}
        actions={[
          <IconButton
            text={Locale.UI.Cancel}
            icon={<CancelIcon />}
            key="cancel"
            onClick={() => {
              props.onClose();
            }}
          />,
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {
              config.update((config) => {
                config.webSearchConfig = { ...tempConfig };
                // 同步更新旧的enableWebSearch字段以保持兼容性
                config.enableWebSearch = tempConfig.enable;
              });
              showToast(
                tempConfig.enable
                  ? Locale.Chat.WebSearch.ConfigSaved
                  : Locale.Chat.WebSearch.ConfigDisabled,
              );
              props.onClose();
            }}
          />,
        ]}
      >
        <List>
          <ListItem
            title={Locale.Chat.WebSearch.Enable}
            subTitle={Locale.Chat.WebSearch.EnableSubTitle}
          >
            <input
              type="checkbox"
              checked={tempConfig.enable}
              onChange={(e) =>
                setTempConfig({ ...tempConfig, enable: e.target.checked })
              }
            />
          </ListItem>

          <ListItem
            title={Locale.Chat.WebSearch.MaxResults}
            subTitle={Locale.Chat.WebSearch.MaxResultsSubTitle}
          >
            <input
              type="number"
              min="1"
              max="20"
              value={tempConfig.maxResults}
              onChange={(e) =>
                setTempConfig({
                  ...tempConfig,
                  maxResults: Math.max(
                    1,
                    Math.min(20, parseInt(e.target.value) || 5),
                  ),
                })
              }
              style={{ width: "60px" }}
            />
          </ListItem>

          <ListItem
            title={Locale.Chat.WebSearch.SearxngUrl}
            subTitle={
              loading
                ? Locale.Chat.WebSearch.CheckingEnvConfig
                : envSearxngUrl
                  ? Locale.Chat.WebSearch.SearxngUrlSubTitleWithEnv(
                      envSearxngUrl,
                    )
                  : Locale.Chat.WebSearch.SearxngUrlSubTitle
            }
          >
            <div style={{ width: "100%" }}>
              <input
                type="text"
                placeholder={
                  envSearxngUrl
                    ? Locale.Chat.WebSearch.SearxngUrlPlaceholderWithEnv
                    : Locale.Chat.WebSearch.SearxngUrlPlaceholder
                }
                value={tempConfig.searxngUrl}
                onChange={(e) =>
                  setTempConfig({
                    ...tempConfig,
                    searxngUrl: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  minWidth: "200px",
                  marginBottom: "8px",
                }}
              />
              {!envSearxngUrl && (
                <div style={{ fontSize: "12px", color: "#666" }}>
                  <span>{Locale.Chat.WebSearch.CommonInstances}</span>
                  {[
                    "https://searx.be",
                    "https://search.sapti.me",
                    "https://so.ddns-ip.net",
                  ].map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        setTempConfig({ ...tempConfig, searxngUrl: url })
                      }
                      style={{
                        marginLeft: "4px",
                        padding: "2px 6px",
                        fontSize: "11px",
                        border: "1px solid #ddd",
                        borderRadius: "3px",
                        background: "#f5f5f5",
                        cursor: "pointer",
                      }}
                    >
                      {url.replace("https://", "")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ListItem>

          <ListItem
            title={Locale.Chat.WebSearch.AiGenerateKeywords}
            subTitle={Locale.Chat.WebSearch.AiGenerateKeywordsSubTitle}
          >
            <input
              type="checkbox"
              checked={tempConfig.aiGenerateKeywords}
              onChange={(e) =>
                setTempConfig({
                  ...tempConfig,
                  aiGenerateKeywords: e.target.checked,
                })
              }
            />
          </ListItem>

          <ListItem
            title={Locale.Chat.WebSearch.DefaultCollapsed}
            subTitle={Locale.Chat.WebSearch.DefaultCollapsedSubTitle}
          >
            <input
              type="checkbox"
              checked={tempConfig.defaultCollapsed}
              onChange={(e) =>
                setTempConfig({
                  ...tempConfig,
                  defaultCollapsed: e.target.checked,
                })
              }
            />
          </ListItem>
        </List>
      </Modal>
    </div>
  );
}

export function ShortcutKeyModal(props: { onClose: () => void }) {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const shortcuts = [
    {
      title: Locale.Chat.ShortcutKey.newChat,
      keys: isMac ? ["⌘", "Shift", "O"] : ["Ctrl", "Shift", "O"],
    },
    { title: Locale.Chat.ShortcutKey.focusInput, keys: ["Shift", "Esc"] },
    {
      title: Locale.Chat.ShortcutKey.copyLastCode,
      keys: isMac ? ["⌘", "Shift", ";"] : ["Ctrl", "Shift", ";"],
    },
    {
      title: Locale.Chat.ShortcutKey.copyLastMessage,
      keys: isMac ? ["⌘", "Shift", "C"] : ["Ctrl", "Shift", "C"],
    },
    {
      title: Locale.Chat.ShortcutKey.showShortcutKey,
      keys: isMac ? ["⌘", "/"] : ["Ctrl", "/"],
    },
  ];
  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.ShortcutKey.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {
              props.onClose();
            }}
          />,
        ]}
      >
        <div className={styles["shortcut-key-container"]}>
          <div className={styles["shortcut-key-grid"]}>
            {shortcuts.map((shortcut, index) => (
              <div key={index} className={styles["shortcut-key-item"]}>
                <div className={styles["shortcut-key-title"]}>
                  {shortcut.title}
                </div>
                <div className={styles["shortcut-key-keys"]}>
                  {shortcut.keys.map((key, i) => (
                    <div key={i} className={styles["shortcut-key"]}>
                      <span>{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Chat() {
  type RenderMessage = ChatMessage & { preview?: boolean };

  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;
  // 移除本地的网络搜索状态，改用全局配置
  // const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);

  const [showExport, setShowExport] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolledToBottom = scrollRef?.current
    ? Math.abs(
        scrollRef.current.scrollHeight -
          (scrollRef.current.scrollTop + scrollRef.current.clientHeight),
      ) <= 1
    : false;
  const isAttachWithTop = useMemo(() => {
    const lastMessage = scrollRef.current?.lastElementChild as HTMLElement;
    // if scrolllRef is not ready or no message, return false
    if (!scrollRef?.current || !lastMessage) return false;
    const topDistance =
      lastMessage!.getBoundingClientRect().top -
      scrollRef.current.getBoundingClientRect().top;
    // leave some space for user question
    return topDistance < 100;
  }, [scrollRef?.current?.scrollHeight]);

  const isTyping = userInput !== "";

  // if user is typing, should auto scroll to bottom
  // if user is not typing, should auto scroll to bottom only if already at bottom
  const { setAutoScroll, scrollDomToBottom } = useScrollToBottom(
    scrollRef,
    (isScrolledToBottom || isAttachWithTop) && !isTyping,
  );
  const [hitBottom, setHitBottom] = useState(true);
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();
  const [attachImages, setAttachImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileInfo[]>([]);
  // 添加网络搜索加载状态
  const [isWebSearching, setIsWebSearching] = useState(false);

  // prompt hints
  const promptStore = usePromptStore();
  const [promptHints, setPromptHints] = useState<RenderPrompt[]>([]);
  const onSearch = useDebouncedCallback(
    (text: string) => {
      const matchedPrompts = promptStore.search(text);
      setPromptHints(matchedPrompts);
    },
    100,
    { leading: true, trailing: true },
  );

  // auto grow input
  const [inputRows, setInputRows] = useState(2);
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2 + Number(!isMobileScreen), rows),
      );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [userInput]);

  // chat commands shortcuts
  const chatCommands = useChatCommand({
    new: () => chatStore.newSession(),
    newm: () => navigate(Path.NewChat),
    prev: () => chatStore.nextSession(-1),
    next: () => chatStore.nextSession(1),
    clear: () =>
      chatStore.updateTargetSession(
        session,
        (session) => (session.clearContextIndex = session.messages.length),
      ),
    fork: () => chatStore.forkSession(),
    del: () => chatStore.deleteSession(chatStore.currentSessionIndex),
  });

  // 添加MCP工具快捷命令映射
  const mcpToolCommands: Record<
    string,
    { clientId: string; toolName: string }
  > = {
    "/file": { clientId: "filesystem", toolName: "list_allowed_directories" },
    "/search": { clientId: "brave-search", toolName: "search" },
    "/web": { clientId: "fetch", toolName: "fetch" },
    "/github": { clientId: "github", toolName: "search_repositories" },
    "/sql": { clientId: "sqlite", toolName: "query" },
    "/git": { clientId: "git", toolName: "status" },
  };

  // 检查用户输入是否应该使用MCP工具
  const shouldUseMcpTool = (text: string): boolean => {
    const mcpKeywords = [
      "github",
      "git",
      "文件",
      "搜索",
      "网页",
      "sql",
      "数据库",
      "repository",
      "repos",
      "查询",
      "文档",
      "代码",
      "clone",
      "commit",
    ];

    const lowerText = text.toLowerCase();
    return mcpKeywords.some((keyword) => lowerText.includes(keyword));
  };

  // 检查消息是否包含MCP调用
  const messageContainsMcpCall = (message: ChatMessage): boolean => {
    if (!message.content) return false;

    // 如果是字符串内容，检查是否包含MCP相关文本
    if (typeof message.content === "string") {
      return (
        message.content.includes("<function_calls>") ||
        message.content.includes("mcp_") ||
        message.content.includes("使用工具")
      );
    }

    // 如果是数组内容，检查每个部分
    if (Array.isArray(message.content)) {
      return message.content.some((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const text = part.text as string;
          return (
            text.includes("<function_calls>") ||
            text.includes("mcp_") ||
            text.includes("使用工具")
          );
        }
        return false;
      });
    }

    return false;
  };

  // only search prompts when user input is short
  const SEARCH_TEXT_LIMIT = 30;
  const onInput = (text: string) => {
    const MAX_TEXT_LENGTH = 3000; // 最大文本长度

    // 修改输入文本处理逻辑
    if (text.length > MAX_TEXT_LENGTH && userInput.length <= MAX_TEXT_LENGTH) {
      // 截断过长的文本内容
      const MAX_FILE_CONTENT_LENGTH = 100000; // 与上传文件相同的最大内容长度
      const truncatedText =
        text.length > MAX_FILE_CONTENT_LENGTH
          ? text.substring(0, MAX_FILE_CONTENT_LENGTH) +
            `\n\n[文件过大，已截断。原文件大小: ${text.length} 字符]`
          : text;

      // 将长文本转换为文件附件
      const longTextFile: FileInfo = {
        name: `输入文本_${new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[T:]/g, "-")}.txt`,
        type: "text/plain",
        size: text.length,
        content: truncatedText,
        originalFile: new File([text], "输入文本.txt", { type: "text/plain" }),
      };

      // 添加到文件附件列表
      setAttachedFiles([...attachedFiles, longTextFile]);

      // 清空输入框
      setUserInput("");

      // 显示提示
      showToast("文本过长，已自动转换为文件附件");

      // 如果文本被截断，显示额外提示
      if (text.length > MAX_FILE_CONTENT_LENGTH) {
        showToast(`文件内容过大，已截断至 ${MAX_FILE_CONTENT_LENGTH} 字符`);
      }

      return;
    }

    setUserInput(text);
    const n = text.trim().length;

    // 检查是否是MCP工具命令前缀
    const commandMatch = Object.keys(mcpToolCommands).find((cmd) =>
      text.trim().startsWith(cmd),
    );

    if (commandMatch) {
      // 如果是工具命令前缀，显示相应的提示
      const { clientId, toolName } = mcpToolCommands[commandMatch];
      const toolPrompt: RenderPrompt = {
        title: `${commandMatch} - ${clientId}/${toolName}`,
        content: `请使用 ${clientId} 客户端的 ${toolName} 工具来${text
          .substring(commandMatch.length)
          .trim()}`,
      };
      setPromptHints([toolPrompt]);
      return;
    }

    // 只有在启用快捷指令功能时才处理 "/" 开头的输入
    if (n === 1 && text === "/" && config.enablePromptHints) {
      setPromptHints(promptStore.search(""));
    } else if (!config.enablePromptHints || text !== "/" || n > 1) {
      // 当功能关闭或不是单独的 "/" 时,清空提示
      setPromptHints([]);
    }
  };

  const doSubmit = async (userInput: string) => {
    if (
      userInput.trim() === "" &&
      isEmpty(attachImages) &&
      attachedFiles.length === 0
    )
      return;

    let finalUserInput = userInput;
    const MAX_TEXT_LENGTH = 3000;

    if (userInput.length > MAX_TEXT_LENGTH) {
      const longTextFile: FileInfo = {
        name: "长文本.txt",
        type: "text/plain",
        size: userInput.length,
        content: userInput,
        originalFile: new File([userInput], "长文本.txt", {
          type: "text/plain",
        }),
      };
      setAttachedFiles([...attachedFiles, longTextFile]);
      finalUserInput = "我发送了一个长文本文件，内容已自动转换为附件。";
      showToast("文本过长，已自动转换为文件附件");
    }

    if (attachedFiles.length > 0) {
      const fileInfosText = attachedFiles
        .map(
          (file) =>
            `文件名: ${file.name}\n类型: ${file.type}\n大小: ${(
              file.size / 1024
            ).toFixed(2)} KB\n\n${file.content}`,
        )
        .join("\n\n---\n\n");
      finalUserInput = finalUserInput
        ? `${finalUserInput}\n\n${fileInfosText}`
        : fileInfosText;
    }

    const matchCommand = chatCommands.match(finalUserInput);
    if (matchCommand.matched) {
      setUserInput("");
      setPromptHints([]);
      matchCommand.invoke();
      return;
    }

    const commandMatch = Object.keys(mcpToolCommands).find((cmd) =>
      finalUserInput.trim().startsWith(cmd),
    );
    if (commandMatch) {
      const { clientId, toolName } = mcpToolCommands[commandMatch];
      const params = finalUserInput.substring(commandMatch.length).trim();
      finalUserInput = `请使用 ${clientId} 客户端的 ${toolName} 工具${
        params ? `，参数是: ${params}` : ""
      }`;
    }

    setIsLoading(true);

    // 保存原始问题用于搜索
    const originalQuestion = finalUserInput;
    let webSearchResults = "";
    let webSearchContentForAI = ""; // 用于拼接到AI回复开头的搜索结果内容

    // 如果启用了网络搜索，执行搜索
    if (config.webSearchConfig.enable) {
      // 设置搜索加载状态
      setIsWebSearching(true);

      try {
        console.log("🔍 开始网络搜索...");

        // 准备搜索查询
        let searchQueries = [originalQuestion]; // 默认使用原始问题

        // 如果启用AI生成关键词，生成多个搜索关键词
        if (config.webSearchConfig.aiGenerateKeywords) {
          try {
            console.log("🤖 正在使用AI生成搜索关键词...");

            // 使用AI生成搜索关键词
            const generateAIKeywords = async (
              question: string,
            ): Promise<string[]> => {
              try {
                // 创建一个临时的AI请求来生成关键词
                const keywordPrompt = `请为以下问题生成2-3个最佳的搜索关键词，用于在搜索引擎中查找相关信息。

要求：
1. 每个关键词应该简洁明了，适合搜索引擎
2. 关键词应该涵盖问题的不同角度
3. 优先使用核心概念和专业术语
4. 每行一个关键词，不要编号或其他格式
5. 最多3个关键词

用户问题：${question}

搜索关键词：`;

                // 使用当前会话的模型配置发送请求
                const response = await fetch("/api/chat", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messages: [
                      {
                        role: "user",
                        content: keywordPrompt,
                      },
                    ],
                    model: session.mask.modelConfig.model,
                    providerName: session.mask.modelConfig.providerName,
                    stream: false,
                    // 使用较低的温度以获得更一致的结果
                    temperature: 0.3,
                    max_tokens: 200,
                  }),
                });

                if (!response.ok) {
                  throw new Error(`AI请求失败: ${response.status}`);
                }

                const data = await response.json();
                const aiResponse =
                  data.choices?.[0]?.message?.content || data.content || "";

                // 解析AI返回的关键词
                const keywords = aiResponse
                  .split("\n")
                  .map((line: string) => line.trim())
                  .filter(
                    (line: string) =>
                      line && !line.includes("：") && !line.includes(":"),
                  )
                  .slice(0, 3); // 最多3个关键词

                // 如果AI生成的关键词太少，添加原始问题作为备选
                if (keywords.length === 0) {
                  return [question];
                }

                return keywords;
              } catch (error) {
                console.error("AI生成关键词失败:", error);
                // 如果AI生成失败，使用简单的关键词提取作为备选
                const words = question
                  .toLowerCase()
                  .replace(/[^\w\s\u4e00-\u9fff]/g, " ")
                  .split(/\s+/)
                  .filter((word) => word.length > 1);

                if (words.length >= 2) {
                  return [question, words.slice(0, 3).join(" ")];
                }
                return [question];
              }
            };

            searchQueries = await generateAIKeywords(originalQuestion);
            console.log("✅ AI生成的搜索关键词:", searchQueries);
          } catch (error) {
            console.error("❌ AI生成关键词失败:", error);
            // 如果生成失败，继续使用原始问题
          }
        }

        // 批量执行搜索查询
        let allSearchResults: any[] = [];

        for (const searchQuery of searchQueries) {
          try {
            // 使用web-search API调用SearXNG
            // 为了确保有足够的结果进行去重，每个关键词都获取用户配置的最大数量
            const searchParams = new URLSearchParams({
              q: searchQuery,
              maxResults: config.webSearchConfig.maxResults.toString(),
            });

            // 如果用户配置了自定义SearXNG URL，添加到参数中
            if (config.webSearchConfig.searxngUrl) {
              searchParams.append(
                "searxngUrl",
                config.webSearchConfig.searxngUrl,
              );
            }

            const searchUrl = `/api/web-search?${searchParams.toString()}`;
            console.log(`📡 搜索关键词 "${searchQuery}":`, searchUrl);

            const searchResponse = await fetch(searchUrl);

            if (!searchResponse.ok) {
              console.warn(
                `搜索关键词 "${searchQuery}" 失败: ${searchResponse.status}`,
              );
              continue;
            }

            // 处理搜索结果
            const searchData = await searchResponse.json();
            if (searchData.results && searchData.results.length > 0) {
              allSearchResults.push(...searchData.results);
            }
          } catch (error) {
            console.warn(`搜索关键词 "${searchQuery}" 出错:`, error);
            continue;
          }
        }

        // 去重并限制结果数量
        const uniqueResults = allSearchResults
          .filter(
            (result, index, self) =>
              index === self.findIndex((r) => r.link === result.link),
          )
          .slice(0, config.webSearchConfig.maxResults);

        const searchData = { results: uniqueResults };

        if (searchData.results && searchData.results.length > 0) {
          // 格式化搜索结果为Markdown格式
          webSearchResults = searchData.results
            .map(
              (result: any, index: number) =>
                `${index + 1}. **${result.title}**\n   ${
                  result.snippet || ""
                }\n   [来源链接](${result.link})\n`,
            )
            .join("\n");

          console.log("✅ 搜索完成，找到", searchData.results.length, "个结果");
          console.log(
            "🔍 搜索结果详情:",
            searchData.results.map((r) => ({ title: r.title, link: r.link })),
          );

          // 准备要拼接到AI回复开头的搜索结果内容
          console.log(
            "🔧 搜索结果配置 - defaultCollapsed:",
            config.webSearchConfig.defaultCollapsed,
          );
          if (config.webSearchConfig.defaultCollapsed) {
            webSearchContentForAI = `<!-- SEARCH_RESULTS_MARKER -->
<details>
<summary>${Locale.Chat.WebSearch.ResultsTitle(searchData.results.length)}</summary>

${webSearchResults}
</details>

---

`;
            console.log(
              "📋 生成折叠搜索结果内容:",
              webSearchContentForAI.length,
              "字符",
            );
          } else {
            webSearchContentForAI = `<!-- SEARCH_RESULTS_MARKER -->
## ${Locale.Chat.WebSearch.ResultsTitle(searchData.results.length)}

${webSearchResults}

---

`;
            console.log(
              "📋 生成展开搜索结果内容:",
              webSearchContentForAI.length,
              "字符",
            );
          }

          // 将搜索结果添加到用户问题中，让AI能够看到搜索内容
          finalUserInput = `${originalQuestion}

请基于我提供的网络搜索结果回答这个问题。搜索结果：
${webSearchResults}`;
        } else {
          webSearchResults = "未找到相关搜索结果。";
          console.log("⚠️ 未找到搜索结果");

          // 准备要拼接到AI回复开头的无结果内容
          if (config.webSearchConfig.defaultCollapsed) {
            webSearchContentForAI = `<!-- SEARCH_RESULTS_MARKER -->
<details>
<summary>${Locale.Chat.WebSearch.ResultsTitle(0)}</summary>

${Locale.Chat.WebSearch.NoResults}
</details>

---

`;
          } else {
            webSearchContentForAI = `<!-- SEARCH_RESULTS_MARKER -->
## ${Locale.Chat.WebSearch.ResultsTitle(0)}

${Locale.Chat.WebSearch.NoResults}

---

`;
          }
        }
      } catch (error) {
        console.error("❌ 网络搜索失败:", error);
        // 搜索出错也添加一个提示到AI回复中
        if (config.webSearchConfig.defaultCollapsed) {
          webSearchContentForAI = `<!-- SEARCH_RESULTS_MARKER -->
<details>
<summary>${Locale.Chat.WebSearch.SearchFailed}</summary>

${Locale.Chat.WebSearch.SearchError(error instanceof Error ? error.message : String(error))}
${Locale.Chat.WebSearch.NoResults}
</details>

---

`;
        } else {
          webSearchContentForAI = `<!-- SEARCH_RESULTS_MARKER -->
## ${Locale.Chat.WebSearch.SearchFailed}

${Locale.Chat.WebSearch.SearchError(error instanceof Error ? error.message : String(error))}
${Locale.Chat.WebSearch.NoResults}

---

`;
        }

        // 显示错误提示
        showToast(
          Locale.Chat.WebSearch.SearchError(
            error instanceof Error ? error.message : String(error),
          ),
        );
      } finally {
        // 搜索完成，清除加载状态
        setIsWebSearching(false);
      }
    }

    // 发送消息
    const messagePromise = chatStore.onUserInput(finalUserInput, attachImages);
    console.log("📤 消息已发送，获得Promise:", !!messagePromise);

    // 如果有搜索结果需要拼接，等待AI回复开始后进行拼接
    console.log("🔍 检查是否需要添加搜索结果:", {
      searchEnabled: config.webSearchConfig.enable,
      hasSearchContent: !!webSearchContentForAI,
      searchContentLength: webSearchContentForAI.length,
      searchContentPreview: webSearchContentForAI.substring(0, 200) + "...",
    });
    if (config.webSearchConfig.enable && webSearchContentForAI) {
      console.log("🚀 开始设置搜索结果添加回调...");

      // 不依赖 messagePromise.then()，直接开始监听消息变化
      console.log("✅ 直接开始监听AI回复...");

      // 使用定时器等待AI消息创建并完成流式输出
      let retryCount = 0;
      const maxRetries = 100; // 增加到100次重试，最多50秒
      const checkInterval = 500; // 增加检查间隔到500ms

      const addSearchResults = () => {
        const currentSession = chatStore.currentSession();
        const messages = currentSession.messages;
        const lastMessage = messages[messages.length - 1];

        console.log(`尝试添加搜索结果 (${retryCount + 1}/${maxRetries})`, {
          hasLastMessage: !!lastMessage,
          messageRole: lastMessage?.role,
          messageContentType: typeof lastMessage?.content,
          isStreaming: lastMessage?.streaming, // 添加流式状态信息
          hasSearchResults:
            typeof lastMessage?.content === "string"
              ? lastMessage.content.includes("SEARCH_RESULTS_MARKER")
              : false,
          messageLength:
            typeof lastMessage?.content === "string"
              ? lastMessage.content.length
              : 0,
          messageContentPreview:
            typeof lastMessage?.content === "string"
              ? lastMessage.content.substring(0, 100) + "..."
              : "非字符串内容",
          totalMessages: messages.length,
          messageIndex: messages.length - 1,
        });

        // 详细检查每个条件
        const hasMessage = !!lastMessage;
        const isAssistant = lastMessage?.role === "assistant";
        const isString = typeof lastMessage?.content === "string";
        const hasNoMarker =
          typeof lastMessage?.content === "string"
            ? !lastMessage.content.includes("SEARCH_RESULTS_MARKER")
            : false;
        const isNotStreaming = !lastMessage?.streaming; // 新增：检查是否还在流式输出

        console.log("🔍 条件检查详情:", {
          hasMessage,
          isAssistant,
          isString,
          hasNoMarker,
          isNotStreaming,
          allConditionsMet:
            hasMessage &&
            isAssistant &&
            isString &&
            hasNoMarker &&
            isNotStreaming,
        });

        if (
          hasMessage &&
          isAssistant &&
          isString &&
          hasNoMarker &&
          isNotStreaming
        ) {
          console.log("✅ 检测到AI消息，正在添加搜索结果");

          // 拼接搜索结果到AI消息开头
          chatStore.updateTargetSession(currentSession, (targetSession) => {
            const msgIndex = targetSession.messages.length - 1;
            if (
              msgIndex >= 0 &&
              targetSession.messages[msgIndex].role === "assistant" &&
              typeof targetSession.messages[msgIndex].content === "string"
            ) {
              const originalContent = targetSession.messages[msgIndex].content;
              targetSession.messages[msgIndex].content =
                webSearchContentForAI + originalContent;

              console.log("✅ 搜索结果已成功添加到消息", {
                originalLength: originalContent.length,
                newLength: targetSession.messages[msgIndex].content.length,
                contentPreview:
                  targetSession.messages[msgIndex].content.substring(0, 300) +
                  "...",
              });
            }
          });

          return; // 成功添加，停止重试
        }

        retryCount++;
        if (retryCount < maxRetries) {
          // 如果AI消息还未创建，继续等待
          setTimeout(addSearchResults, checkInterval);
        } else {
          console.warn("❌ 添加搜索结果超时，停止重试");
          // 输出最终状态用于调试
          const finalSession = chatStore.currentSession();
          const finalMessages = finalSession.messages;
          const finalLastMessage = finalMessages[finalMessages.length - 1];
          console.warn("❌ 最终状态:", {
            totalMessages: finalMessages.length,
            lastMessageRole: finalLastMessage?.role,
            lastMessageContentType: typeof finalLastMessage?.content,
            lastMessageLength:
              typeof finalLastMessage?.content === "string"
                ? finalLastMessage.content.length
                : 0,
            lastMessagePreview:
              typeof finalLastMessage?.content === "string"
                ? finalLastMessage.content.substring(0, 100) + "..."
                : "非字符串内容",
          });
        }
      };

      // 开始监听，给AI消息创建更多时间
      setTimeout(addSearchResults, 1000);

      // 保留原来的 Promise 处理，以防将来需要
      messagePromise
        .then(() => {
          console.log("✅ messagePromise.then() 回调被执行!");
          console.log("消息发送完成，开始监听AI回复...");
        })
        .catch((error) => {
          console.error("❌ messagePromise 被拒绝:", error);
          console.error("❌ 错误类型:", typeof error);
          console.error(
            "❌ 错误详情:",
            error?.message || error?.toString() || "未知错误",
          );
        });
    }

    messagePromise.finally(() => {
      setIsLoading(false);
    });

    setAttachImages([]);
    setAttachedFiles([]); // 清除附加文件
    chatStore.setLastInput(finalUserInput);
    setUserInput("");
    setPromptHints([]);
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  const onPromptSelect = (prompt: RenderPrompt) => {
    setTimeout(() => {
      setPromptHints([]);

      const matchedChatCommand = chatCommands.match(prompt.content);
      if (matchedChatCommand.matched) {
        // if user is selecting a chat command, just trigger it
        matchedChatCommand.invoke();
        setUserInput("");
      } else {
        // or fill the prompt
        setUserInput(prompt.content);
      }
      inputRef.current?.focus();
    }, 30);
  };

  // stop response
  const onUserStop = (messageId: string) => {
    ChatControllerPool.stop(session.id, messageId);
  };

  useEffect(() => {
    chatStore.updateTargetSession(session, (session) => {
      const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
      session.messages.forEach((m) => {
        // check if should stop all stale messages
        if (m.error || new Date(m.date).getTime() < stopTiming) {
          if (m.streaming) {
            m.streaming = false;
          }

          if (m.content.length === 0) {
            m.error = true;
            m.content = prettyObject({
              error: true,
              message: "empty response",
            });
          }
        }
      });

      // auto sync mask config from global config
      if (session.mask.syncGlobalConfig) {
        console.log("[Mask] syncing from global, name = ", session.mask.name);
        session.mask.modelConfig = { ...config.modelConfig };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // check if should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // if ArrowUp and no userInput, fill with last input
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(chatStore.lastInput ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e) && promptHints.length === 0) {
      doSubmit(userInput);
      e.preventDefault();
    }
  };
  const onRightClick = (e: any, message: ChatMessage) => {
    // copy to clipboard
    const contentToCopy =
      message.role === "user"
        ? getMessageTextContentForDisplay(message)
        : getMessageTextContent(message);

    if (selectOrCopy(e.currentTarget, contentToCopy)) {
      if (userInput.length === 0) {
        const contentToFill =
          message.role === "user"
            ? getMessageTextContentForDisplay(message)
            : getMessageTextContent(message);
        setUserInput(contentToFill);
      }

      e.preventDefault();
    }
  };

  const deleteMessage = (msgId?: string) => {
    chatStore.updateTargetSession(
      session,
      (session) =>
        (session.messages = session.messages.filter((m) => m.id !== msgId)),
    );
  };

  const onDelete = (msgId: string) => {
    deleteMessage(msgId);
  };

  const onResend = (message: ChatMessage) => {
    // when it is resending a message
    // 1. for a user's message, find the next bot response
    // 2. for a bot's message, find the last user's input
    // 3. delete original user input and bot's message
    // 4. resend the user's input

    const resendingIndex = session.messages.findIndex(
      (m) => m.id === message.id,
    );

    if (resendingIndex < 0 || resendingIndex >= session.messages.length) {
      console.error("[Chat] failed to find resending message", message);
      return;
    }

    let userMessage: ChatMessage | undefined;
    let botMessage: ChatMessage | undefined;

    if (message.role === "assistant") {
      // if it is resending a bot's message, find the user input for it
      botMessage = message;
      for (let i = resendingIndex; i >= 0; i -= 1) {
        if (session.messages[i].role === "user") {
          userMessage = session.messages[i];
          break;
        }
      }
    } else if (message.role === "user") {
      // if it is resending a user's input, find the bot's response
      userMessage = message;
      for (let i = resendingIndex; i < session.messages.length; i += 1) {
        if (session.messages[i].role === "assistant") {
          botMessage = session.messages[i];
          break;
        }
      }
    }

    if (userMessage === undefined) {
      console.error("[Chat] failed to resend", message);
      return;
    }

    // delete the original messages
    deleteMessage(userMessage.id);
    deleteMessage(botMessage?.id);

    // resend the message
    setIsLoading(true);
    const textContent =
      userMessage.role === "user"
        ? getMessageTextContentForDisplay(userMessage)
        : getMessageTextContent(userMessage);
    const images = getMessageImages(userMessage);
    chatStore.onUserInput(textContent, images).then(() => setIsLoading(false));
    // 只在非移动设备上聚焦输入框
    if (!isMobileScreen) {
      inputRef.current?.focus();
    }
  };

  const onPinMessage = (message: ChatMessage) => {
    chatStore.updateTargetSession(session, (session) =>
      session.mask.context.push(message),
    );

    showToast(Locale.Chat.Actions.PinToastContent, {
      text: Locale.Chat.Actions.PinToastAction,
      onClick: () => {
        setShowPromptModal(true);
      },
    });
  };

  const accessStore = useAccessStore();
  const [speechStatus, setSpeechStatus] = useState(false);
  const [speechLoading, setSpeechLoading] = useState(false);
  async function openaiSpeech(text: string) {
    if (speechStatus) {
      ttsPlayer.stop();
      setSpeechStatus(false);
    } else {
      var api: ClientApi;
      api = new ClientApi(ModelProvider.GPT);
      const config = useAppConfig.getState();
      setSpeechLoading(true);
      ttsPlayer.init();
      let audioBuffer: ArrayBuffer;
      const { markdownToTxt } = require("markdown-to-txt");
      const textContent = markdownToTxt(text);
      if (config.ttsConfig.engine !== DEFAULT_TTS_ENGINE) {
        const edgeVoiceName = accessStore.edgeVoiceName();
        const tts = new MsEdgeTTS();
        await tts.setMetadata(
          edgeVoiceName,
          OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
        );
        audioBuffer = await tts.toArrayBuffer(textContent);
      } else {
        audioBuffer = await api.llm.speech({
          model: config.ttsConfig.model,
          input: textContent,
          voice: config.ttsConfig.voice,
          speed: config.ttsConfig.speed,
        });
      }
      setSpeechStatus(true);
      ttsPlayer
        .play(audioBuffer, () => {
          setSpeechStatus(false);
        })
        .catch((e) => {
          console.error("[OpenAI Speech]", e);
          showToast(prettyObject(e));
          setSpeechStatus(false);
        })
        .finally(() => setSpeechLoading(false));
    }
  }

  const context: RenderMessage[] = useMemo(() => {
    return session.mask.hideContext ? [] : session.mask.context.slice();
  }, [session.mask.context, session.mask.hideContext]);

  if (
    context.length === 0 &&
    session.messages.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    if (!accessStore.isAuthorized()) {
      copiedHello.content = Locale.Error.Unauthorized;
    }
    context.push(copiedHello);
  }

  // preview messages
  const renderMessages = useMemo(() => {
    return context
      .concat(session.messages as RenderMessage[])
      .filter((message) => !message.isInternalCall) // 过滤掉内部调用消息
      .concat(
        userInput.length > 0 && config.sendPreviewBubble
          ? [
              {
                ...createMessage({
                  role: "user",
                  content: userInput,
                }),
                preview: true,
              },
            ]
          : [],
      );
  }, [
    config.sendPreviewBubble,
    context,
    isLoading,
    session.messages,
    userInput,
  ]);

  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );
  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  const messages = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  const onChatBodyScroll = (e: HTMLElement) => {
    const bottomHeight = e.scrollTop + e.clientHeight;
    const edgeThreshold = e.clientHeight;

    const isTouchTopEdge = e.scrollTop <= edgeThreshold;
    const isTouchBottomEdge = bottomHeight >= e.scrollHeight - edgeThreshold;
    const isHitBottom =
      bottomHeight >= e.scrollHeight - (isMobileScreen ? 4 : 10);

    const prevPageMsgIndex = msgRenderIndex - CHAT_PAGE_SIZE;
    const nextPageMsgIndex = msgRenderIndex + CHAT_PAGE_SIZE;

    if (isTouchTopEdge && !isTouchBottomEdge) {
      setMsgRenderIndex(prevPageMsgIndex);
    } else if (isTouchBottomEdge) {
      setMsgRenderIndex(nextPageMsgIndex);
    }

    setHitBottom(isHitBottom);
    setAutoScroll(isHitBottom);
  };
  function scrollToBottom() {
    setMsgRenderIndex(renderMessages.length - CHAT_PAGE_SIZE);
    scrollDomToBottom();
  }

  // clear context index = context length + index in messages
  const clearContextIndex =
    (session.clearContextIndex ?? -1) >= 0
      ? session.clearContextIndex! + context.length - msgRenderIndex
      : -1;

  const [showPromptModal, setShowPromptModal] = useState(false);

  const clientConfig = useMemo(() => getClientConfig(), []);

  const autoFocus = !isMobileScreen; // wont auto focus on mobile screen
  const showMaxIcon = !isMobileScreen && !clientConfig?.isApp;

  useCommand({
    fill: setUserInput,
    submit: (text) => {
      doSubmit(text);
    },
    code: (text) => {
      if (accessStore.disableFastLink) return;
      console.log("[Command] got code from url: ", text);
      showConfirm(Locale.URLCommand.Code + `code = ${text}`).then((res) => {
        if (res) {
          accessStore.update((access) => (access.accessCode = text));
        }
      });
    },
    settings: (text) => {
      if (accessStore.disableFastLink) return;

      try {
        const payload = JSON.parse(text) as {
          key?: string;
          url?: string;
        };

        console.log("[Command] got settings from url: ", payload);

        if (payload.key || payload.url) {
          showConfirm(
            Locale.URLCommand.Settings +
              `\n${JSON.stringify(payload, null, 4)}`,
          ).then((res) => {
            if (!res) return;
            if (payload.key) {
              accessStore.update(
                (access) => (access.openaiApiKey = payload.key!),
              );
            }
            if (payload.url) {
              accessStore.update((access) => (access.openaiUrl = payload.url!));
            }
            accessStore.update((access) => (access.useCustomConfig = true));
          });
        }
      } catch {
        console.error("[Command] failed to get settings from url: ", text);
      }
    },
  });

  // edit / insert message modal
  const [isEditingMessage, setIsEditingMessage] = useState(false);

  // remember unfinished input
  useEffect(() => {
    // try to load from local storage
    const key = UNFINISHED_INPUT(session.id);
    const mayBeUnfinishedInput = localStorage.getItem(key);
    if (mayBeUnfinishedInput && userInput.length === 0) {
      setUserInput(mayBeUnfinishedInput);
      localStorage.removeItem(key);
    }

    const dom = inputRef.current;
    return () => {
      localStorage.setItem(key, dom?.value ?? "");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      // 处理粘贴的文件
      e.preventDefault();

      // 检查是否为图片
      const imageFiles = Array.from(e.clipboardData.files).filter((file) =>
        file.type.startsWith("image/"),
      );

      // 处理图片文件
      if (imageFiles.length > 0) {
        // 检查图片数量限制
        if (attachImages.length >= 3) {
          showToast(Locale.Chat.Upload.MaxImagesReached);
          return;
        }

        setUploading(true);
        try {
          for (const file of imageFiles) {
            if (attachImages.length < 3) {
              const dataUrl = await uploadImageRemote(file);
              setAttachImages([...attachImages, dataUrl]);
            } else {
              break; // 达到3张图片限制
            }
          }
        } catch (error) {
          console.error("上传图片失败:", error);
          showToast("上传图片失败");
        } finally {
          setUploading(false);
        }
        return;
      }

      // 处理其他类型文件
      const textFiles = Array.from(e.clipboardData.files);
      if (textFiles.length > 0) {
        // 检查文件数量限制
        if (attachedFiles.length >= 5) {
          showToast(Locale.Chat.Upload.MaxFilesReached);
          return;
        }

        setUploading(true);
        try {
          for (const file of textFiles) {
            if (attachedFiles.length < 5) {
              // 读取文件内容
              const text = await readFileAsText(file);
              const maxLength = 100000;
              const truncatedText =
                text.length > maxLength
                  ? text.substring(0, maxLength) +
                    `\n\n[${Locale.Chat.Upload.FilesTooLarge}。原文件大小: ${text.length} 字符]`
                  : text;

              // 添加到附件列表
              setAttachedFiles([
                ...attachedFiles,
                {
                  name: file.name || "粘贴的文件.txt",
                  type: file.type || "text/plain",
                  size: file.size,
                  content: truncatedText,
                  originalFile: file,
                },
              ]);
            } else {
              break; // 达到5个文件限制
            }
          }
        } catch (error) {
          console.error("读取文件失败:", error);
          showToast(Locale.Chat.Upload.ReadFileFailed);
        } finally {
          setUploading(false);
        }
      }
    } else {
      // 处理粘贴的文本
      const text = e.clipboardData.getData("text/plain");
      if (text && text.length > 1000) {
        // 如果文本超过1000字符
        e.preventDefault();

        // 检查文件数量限制
        if (attachedFiles.length >= 5) {
          showToast(Locale.Chat.Upload.MaxFilesReached);
          return;
        }

        // 截断过长的文本内容
        const maxLength = 100000;
        const truncatedText =
          text.length > maxLength
            ? text.substring(0, maxLength) +
              `\n\n[${Locale.Chat.Upload.FilesTooLarge}。原文件大小: ${text.length} 字符]`
            : text;

        // 将长文本转为文件附件
        const file = new File([text], "粘贴的文本.txt", { type: "text/plain" });
        setAttachedFiles([
          ...attachedFiles,
          {
            name: "粘贴的文本.txt",
            type: "text/plain",
            size: text.length,
            content: truncatedText,
            originalFile: file,
          },
        ]);

        showToast(Locale.Chat.Upload.PasteAsAttachment);
      }
    }
  };

  async function uploadImage(file: File) {
    const images: string[] = [];
    images.push(...attachImages);

    images.push(
      ...(await new Promise<string[]>((res, rej) => {
        setUploading(true);
        const imagesData: string[] = [];
        uploadImageRemote(file)
          .then((dataUrl) => {
            imagesData.push(dataUrl);
            setUploading(false);
            res(imagesData);
          })
          .catch((e) => {
            setUploading(false);
            rej(e);
          });
      })),
    );

    const imagesLength = images.length;
    if (imagesLength > 3) {
      images.splice(3, imagesLength - 3);
    }
    setAttachImages(images);
  }

  // 修改上传附件的处理函数
  async function handleUploadAttachments() {
    // 从file.ts导入的新函数
    uploadAttachments(
      // 开始上传
      () => {
        setUploading(true);
      },
      // 上传成功
      (fileInfos, imageUrls) => {
        let messages = [];

        // 处理文件
        if (fileInfos.length > 0) {
          // 合并新上传的文件和已有的文件，最多保留5个
          const updatedFiles = [...attachedFiles, ...fileInfos];
          let actualFileCount = fileInfos.length;

          if (updatedFiles.length > 5) {
            actualFileCount = Math.max(0, 5 - attachedFiles.length);
            updatedFiles.splice(5, updatedFiles.length - 5);
            messages.push(Locale.Chat.Upload.MaxFilesReached + "，已保留前5个");
          } else if (actualFileCount > 0) {
            messages.push(Locale.Chat.Upload.FilesUploaded(actualFileCount));
          }
          setAttachedFiles(updatedFiles);
        }

        // 处理图片
        if (imageUrls.length > 0) {
          const images = [...attachImages];
          let actualImageCount = imageUrls.length;

          images.push(...imageUrls);

          // 最多保留3张图片
          if (images.length > 3) {
            actualImageCount = Math.max(0, 3 - attachImages.length);
            images.splice(3, images.length - 3);
            messages.push(
              Locale.Chat.Upload.MaxImagesReached + "，已保留前3张",
            );
          } else if (actualImageCount > 0) {
            messages.push(Locale.Chat.Upload.ImagesUploaded(actualImageCount));
          }
          setAttachImages(images);
        }

        // 显示合并后的消息
        if (messages.length > 0) {
          showToast(messages.join("，"));
        }
      },
      // 上传失败
      (error) => {
        showToast(Locale.Chat.Upload.ReadFileFailed);
      },
      // 完成上传
      () => {
        setUploading(false);
      },
    );
  }

  // 快捷键 shortcut keys
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false);

  // 网络搜索配置弹窗
  const [showWebSearchConfigModal, setShowWebSearchConfigModal] =
    useState(false);

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      // 打开新聊天 command + shift + o
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        setTimeout(() => {
          chatStore.newSession();
          navigate(Path.Chat);
        }, 10);
      }
      // 聚焦聊天输入 shift + esc
      else if (event.shiftKey && event.key.toLowerCase() === "escape") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      // 复制最后一个代码块 command + shift + ;
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.code === "Semicolon"
      ) {
        event.preventDefault();
        const copyCodeButton =
          document.querySelectorAll<HTMLElement>(".copy-code-button");
        if (copyCodeButton.length > 0) {
          copyCodeButton[copyCodeButton.length - 1].click();
        }
      }
      // 复制最后一个回复 command + shift + c
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          const lastMessageContent =
            lastMessage.role === "user"
              ? getMessageTextContentForDisplay(lastMessage)
              : getMessageTextContent(lastMessage);
          copyToClipboard(lastMessageContent);
        }
      }
      // 展示快捷键 command + /
      else if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        setShowShortcutKeyModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [messages, chatStore, navigate]);

  const [showChatSidePanel, setShowChatSidePanel] = useState(false);

  // 添加触摸滑动相关的状态
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  // 处理触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isMobileScreen) return;

    const swipeDistance = touchEndX - touchStartX;
    const minSwipeDistance = 100; // 最小滑动距离

    // 向右滑动且距离足够
    if (swipeDistance > minSwipeDistance) {
      navigate(Path.Home);
    }

    // 重置触摸状态
    setTouchStartX(0);
    setTouchEndX(0);
  };

  // 添加删除单个文件函数
  function deleteAttachedFile(index: number) {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  }

  const MCPAction = () => {
    const [count, setCount] = useState<number>(0);
    const [mcpEnabled, setMcpEnabled] = useState(false);

    useEffect(() => {
      const checkMcpStatus = async () => {
        const enabled = await isMcpEnabled();
        setMcpEnabled(enabled);
        if (enabled) {
          const count = await getAvailableClientsCount();
          setCount(count);
        }
      };
      checkMcpStatus();
    }, []);

    if (!mcpEnabled) return null;

    return (
      <ChatAction
        onClick={() => navigate(Path.McpMarket)}
        text={`MCP${count ? ` (${count})` : ""}`}
        icon={<McpToolIcon />}
      />
    );
  };

  // 在 _Chat 组件内添加新状态
  const [editingFile, setEditingFile] = useState<FileInfo | null>(null);
  const [showFileEditModal, setShowFileEditModal] = useState(false);

  // 在_Chat组件中添加状态
  const [editingImage, setEditingImage] = useState<string | null>(null);

  // 在_Chat组件中添加状态，记录当前编辑图片所属的消息ID
  const [editingImageMessageId, setEditingImageMessageId] = useState<
    string | null
  >(null);

  // 添加状态用于控制MCP工具面板的显示
  const [showMcpToolPanel, setShowMcpToolPanel] = useState(false);

  // 添加工具选择处理函数
  const handleMcpToolSelect = (clientId: string, toolName: string) => {
    // 构建工具调用提示模板
    const toolTemplate = `请使用 ${clientId} 客户端的 ${toolName} 工具，`;

    // 如果用户已经输入了内容，保留它
    if (userInput) {
      setUserInput(`${toolTemplate}${userInput}`);
    } else {
      setUserInput(toolTemplate);
    }

    // 关闭工具面板并聚焦输入框
    setShowMcpToolPanel(false);
    inputRef.current?.focus();
  };

  return (
    <div
      className={styles.chat}
      key={session.id}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="window-header" data-tauri-drag-region>
        {isMobileScreen && (
          <div className="window-actions">
            <div className={"window-action-button"}>
              <IconButton
                icon={<ReturnIcon />}
                bordered
                title={Locale.Chat.Actions.ChatList}
                onClick={() => navigate(Path.Home)}
              />
            </div>
          </div>
        )}

        <div className={clsx("window-header-title", styles["chat-body-title"])}>
          <div
            className={clsx(
              "window-header-main-title",
              styles["chat-body-main-title"],
            )}
            onClickCapture={() => setIsEditingMessage(true)}
          >
            {!session.topic ? DEFAULT_TOPIC : session.topic}
          </div>
        </div>
        <div className="window-actions">
          <div className="window-action-button">
            <IconButton
              icon={<ReloadIcon />}
              bordered
              title={Locale.Chat.Actions.RefreshTitle}
              onClick={() => {
                showToast(Locale.Chat.Actions.RefreshToast);
                chatStore.summarizeSession(true, session);
              }}
            />
          </div>
          {!isMobileScreen && (
            <div className="window-action-button">
              <IconButton
                icon={<RenameIcon />}
                bordered
                title={Locale.Chat.EditMessage.Title}
                aria={Locale.Chat.EditMessage.Title}
                onClick={() => setIsEditingMessage(true)}
              />
            </div>
          )}
          <div className="window-action-button">
            <IconButton
              icon={<ExportIcon />}
              bordered
              title={Locale.Chat.Actions.Export}
              onClick={() => {
                setShowExport(true);
              }}
            />
          </div>
          {showMaxIcon && (
            <div className="window-action-button">
              <IconButton
                icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                bordered
                title={Locale.Chat.Actions.FullScreen}
                aria={Locale.Chat.Actions.FullScreen}
                onClick={() => {
                  config.update(
                    (config) => (config.tightBorder = !config.tightBorder),
                  );
                }}
              />
            </div>
          )}
        </div>

        <PromptToast
          showToast={!hitBottom}
          showModal={showPromptModal}
          setShowModal={setShowPromptModal}
        />
      </div>
      <div className={styles["chat-main"]}>
        <div className={styles["chat-body-container"]}>
          <div
            className={styles["chat-body"]}
            ref={scrollRef}
            onScroll={(e) => onChatBodyScroll(e.currentTarget)}
            onMouseDown={() => inputRef.current?.blur()}
            onTouchStart={() => {
              inputRef.current?.blur();
              setAutoScroll(false);
            }}
          >
            {messages.map((message, i) => {
              const isUser = message.role === "user";
              const isContext = i < context.length;
              const showActions =
                i > 0 &&
                !message.streaming &&
                !message.preview &&
                message.content.length > 0 &&
                !isContext;
              const showTyping = message.preview || message.streaming;

              const shouldShowClearContextDivider = i === clearContextIndex - 1;

              return (
                <Fragment key={message.id}>
                  <div
                    className={
                      isUser
                        ? styles["chat-message-user"]
                        : styles["chat-message"]
                    }
                  >
                    <div className={styles["chat-message-container"]}>
                      <div className={styles["chat-message-header"]}>
                        <div className={styles["chat-message-avatar"]}>
                          <div className={styles["chat-message-edit"]}>
                            <IconButton
                              icon={<EditIcon />}
                              aria={Locale.Chat.Actions.Edit}
                              onClick={async () => {
                                const newMessage = await showPrompt(
                                  Locale.Chat.Actions.Edit,
                                  message.role === "user"
                                    ? getMessageTextContentForDisplay(message)
                                    : getMessageTextContent(message),
                                  10,
                                );
                                let newContent: string | MultimodalContent[] =
                                  newMessage;
                                const images = getMessageImages(message);
                                if (images.length > 0) {
                                  newContent = [
                                    { type: "text", text: newMessage },
                                  ];
                                  for (let i = 0; i < images.length; i++) {
                                    newContent.push({
                                      type: "image_url",
                                      image_url: {
                                        url: images[i],
                                      },
                                    });
                                  }
                                }
                                chatStore.updateTargetSession(
                                  session,
                                  (session) => {
                                    const m = session.mask.context
                                      .concat(session.messages)
                                      .find((m) => m.id === message.id);
                                    if (m) {
                                      m.content = newContent;
                                    }
                                  },
                                );
                              }}
                            ></IconButton>
                          </div>
                          {isUser ? (
                            <div className={styles["chat-message-avatar"]}>
                              <div className={styles["chat-message-edit"]}>
                                <IconButton
                                  icon={<EditIcon />}
                                  aria={Locale.Chat.Actions.Edit}
                                  onClick={async () => {
                                    const newMessage = await showPrompt(
                                      Locale.Chat.Actions.Edit,
                                      message.role === "user"
                                        ? getMessageTextContentForDisplay(
                                            message,
                                          )
                                        : getMessageTextContent(message),
                                      10,
                                    );
                                    let newContent:
                                      | string
                                      | MultimodalContent[] = newMessage;
                                    const images = getMessageImages(message);
                                    if (images.length > 0) {
                                      newContent = [
                                        { type: "text", text: newMessage },
                                      ];
                                      for (let i = 0; i < images.length; i++) {
                                        newContent.push({
                                          type: "image_url",
                                          image_url: {
                                            url: images[i],
                                          },
                                        });
                                      }
                                    }
                                    chatStore.updateTargetSession(
                                      session,
                                      (session) => {
                                        const m = session.mask.context
                                          .concat(session.messages)
                                          .find((m) => m.id === message.id);
                                        if (m) {
                                          m.content = newContent;
                                        }
                                      },
                                    );
                                  }}
                                ></IconButton>
                              </div>
                              <div className={styles["empty-avatar"]}></div>
                            </div>
                          ) : (
                            <>
                              {["system"].includes(message.role) ? (
                                <Avatar avatar="2699-fe0f" />
                              ) : (
                                <MaskAvatar
                                  avatar={session.mask.avatar}
                                  model={
                                    message.model ||
                                    session.mask.modelConfig.model
                                  }
                                />
                              )}
                            </>
                          )}
                        </div>
                        {!isUser && (
                          <div className={styles["chat-model-name"]}>
                            {message.model}
                          </div>
                        )}
                      </div>

                      <div className={styles["chat-message-item"]}>
                        <Markdown
                          key={message.streaming ? "loading" : "done"}
                          content={
                            isUser
                              ? getMessageTextContentForDisplay(message)
                              : getMessageTextContent(message)
                          }
                          loading={
                            (message.preview || message.streaming) &&
                            message.content.length === 0 &&
                            !isUser
                          }
                          fontSize={fontSize}
                          fontFamily={fontFamily}
                          parentRef={scrollRef}
                          defaultShow={i >= messages.length - 6}
                          isUser={isUser}
                          messageId={message.id}
                        />
                        {getMessageImages(message).length == 1 && (
                          <img
                            className={styles["chat-message-item-image"]}
                            src={getMessageImages(message)[0]}
                            alt=""
                            onClick={() => {
                              setEditingImage(getMessageImages(message)[0]);
                              setEditingImageMessageId(message.id || null); // 修复undefined的情况
                            }}
                          />
                        )}
                        {getMessageImages(message).length > 1 && (
                          <div
                            className={styles["chat-message-item-images"]}
                            style={
                              {
                                "--image-count":
                                  getMessageImages(message).length,
                              } as React.CSSProperties
                            }
                          >
                            {getMessageImages(message).map((image, index) => {
                              return (
                                <img
                                  className={
                                    styles["chat-message-item-image-multi"]
                                  }
                                  key={index}
                                  src={image}
                                  alt=""
                                  onClick={() => {
                                    setEditingImage(image);
                                    setEditingImageMessageId(
                                      message.id || null,
                                    ); // 修复undefined的情况
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {showActions && (
                        <div
                          className={styles["chat-message-actions"]}
                          style={{ marginTop: "8px" }}
                        >
                          <div className={styles["chat-input-actions"]}>
                            <>
                              <ChatAction
                                text={Locale.Chat.Actions.Retry}
                                icon={<ResetIcon />}
                                onClick={() => onResend(message)}
                              />
                              <ChatAction
                                text={Locale.Chat.Actions.Delete}
                                icon={<DeleteIcon />}
                                onClick={() => onDelete(message.id || "")} // 如果id是undefined，使用空字符串
                              />
                              <ChatAction
                                text={Locale.Chat.Actions.Pin}
                                icon={<PinIcon />}
                                onClick={() => onPinMessage(message)}
                              />
                              <ChatAction
                                text={Locale.Chat.Actions.Copy}
                                icon={<CopyIcon />}
                                onClick={() =>
                                  copyToClipboard(
                                    message.role === "user"
                                      ? getMessageTextContentForDisplay(message)
                                      : getMessageTextContent(message),
                                  )
                                }
                              />
                              {config.ttsConfig.enable && (
                                <ChatAction
                                  text={
                                    speechStatus
                                      ? Locale.Chat.Actions.StopSpeech
                                      : Locale.Chat.Actions.Speech
                                  }
                                  icon={
                                    speechStatus ? (
                                      <SpeakStopIcon />
                                    ) : (
                                      <SpeakIcon />
                                    )
                                  }
                                  onClick={() =>
                                    openaiSpeech(
                                      message.role === "user"
                                        ? getMessageTextContentForDisplay(
                                            message,
                                          )
                                        : getMessageTextContent(message),
                                    )
                                  }
                                />
                              )}
                            </>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {shouldShowClearContextDivider && <ClearContextDivider />}
                </Fragment>
              );
            })}
          </div>
          <div className={styles["chat-input-panel"]}>
            <PromptHints
              prompts={promptHints}
              onPromptSelect={onPromptSelect}
            />

            <ChatActions
              uploadAttachments={handleUploadAttachments}
              setAttachImages={setAttachImages}
              setUploading={setUploading}
              showPromptModal={() => setShowPromptModal(true)}
              scrollToBottom={scrollToBottom}
              hitBottom={hitBottom}
              uploading={uploading}
              showPromptHints={() => {
                // Click again to close
                if (promptHints.length > 0) {
                  setPromptHints([]);
                  return;
                }

                inputRef.current?.focus();
                setUserInput("/");
                onSearch("");
              }}
              setShowShortcutKeyModal={setShowShortcutKeyModal}
              setUserInput={setUserInput}
              setShowChatSidePanel={setShowChatSidePanel}
              // 新增显示MCP工具面板的函数
              showMcpToolPanel={() => setShowMcpToolPanel(true)}
              // 新增显示网络搜索配置弹窗的函数
              showWebSearchConfig={() => setShowWebSearchConfigModal(true)}
            />

            {/* 显示MCP工具面板 */}
            {showMcpToolPanel && (
              <McpToolPanel
                onToolSelect={handleMcpToolSelect}
                onClose={() => setShowMcpToolPanel(false)}
              />
            )}

            <label
              className={clsx(styles["chat-input-panel-inner"], {
                [styles["chat-input-panel-inner-attach"]]:
                  attachImages.length !== 0 || attachedFiles.length !== 0,
              })}
              htmlFor="chat-input"
            >
              {/* 网络搜索加载提示 */}
              {isWebSearching && (
                <div className={styles["web-search-loading"]}>
                  <LoadingIcon />
                  <span>{Locale.Chat.WebSearch.Searching}</span>
                </div>
              )}

              <textarea
                id="chat-input"
                ref={inputRef}
                className={styles["chat-input"]}
                placeholder={
                  isMobileScreen
                    ? Locale.Chat.MobileInput
                    : Locale.Chat.Input(submitKey)
                }
                onInput={(e) => onInput(e.currentTarget.value)}
                value={userInput}
                onKeyDown={onInputKeyDown}
                onFocus={scrollToBottom}
                onClick={scrollToBottom}
                onPaste={handlePaste}
                rows={inputRows}
                autoFocus={autoFocus}
                disabled={isWebSearching} // 搜索时禁用输入
                style={{
                  fontSize: config.fontSize,
                  fontFamily: config.fontFamily,
                }}
              />

              {/* 附件容器（包含图片和文件） */}
              {(attachImages.length > 0 || attachedFiles.length > 0) && (
                <div className={styles["attachments-container"]}>
                  {/* 图片附件 */}
                  {attachImages.map((image, index) => (
                    <div
                      key={`img-${index}`}
                      className={styles["attach-image"]}
                      style={{ backgroundImage: `url("${image}")` }}
                      onClick={() => setEditingImage(image)}
                    >
                      <div className={styles["attach-image-mask"]}>
                        <DeleteImageButton
                          deleteImage={(e) => {
                            e.stopPropagation(); // 防止触发图片点击事件
                            setAttachImages(
                              attachImages.filter((_, i) => i !== index),
                            );
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* 文件附件 */}
                  {attachedFiles.map((file, index) => (
                    <div
                      key={`file-${index}`}
                      className={styles["attach-file"]}
                      onClick={async () => {
                        // 使用与消息编辑相同的showPrompt函数
                        const newContent = await showPrompt(
                          `编辑文件：${file.name}`,
                          file.content,
                          20, // 更多行数以便于编辑文件内容
                        );

                        if (newContent) {
                          // 更新文件内容
                          const updatedFiles = attachedFiles.map((f, i) => {
                            if (i === index) {
                              // 更新文件大小
                              const newSize = new Blob([newContent]).size;
                              return {
                                ...f,
                                content: newContent,
                                size: newSize,
                                originalFile: new File([newContent], f.name, {
                                  type: f.type,
                                }),
                              };
                            }
                            return f;
                          });
                          setAttachedFiles(updatedFiles);
                        }
                      }}
                    >
                      <div className={styles["attach-file-card"]}>
                        <div
                          className={clsx(
                            styles["attach-file-icon"],
                            getFileIconClass(file.type),
                          )}
                        >
                          <FileIcon />
                        </div>
                        <div className={styles["attach-file-info"]}>
                          <div className={styles["attach-file-name"]}>
                            {file.name}
                          </div>
                          <div className={styles["attach-file-size"]}>
                            {(file.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <div className={styles["attach-image-mask"]}>
                        <DeleteImageButton
                          deleteImage={(e) => {
                            e.stopPropagation(); // 防止触发文件点击事件
                            deleteAttachedFile(index);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <IconButton
                icon={<SendWhiteIcon />}
                text={isMobileScreen ? undefined : Locale.Chat.Send}
                className={styles["chat-input-send"]}
                type="primary"
                onClick={() => doSubmit(userInput)}
                disabled={isWebSearching} // 搜索时禁用发送按钮
              />
            </label>
          </div>
        </div>
        <div
          className={clsx(styles["chat-side-panel"], {
            [styles["mobile"]]: isMobileScreen,
            [styles["chat-side-panel-show"]]: showChatSidePanel,
          })}
        >
          {showChatSidePanel && (
            <RealtimeChat
              onClose={() => {
                setShowChatSidePanel(false);
              }}
              onStartVoice={async () => {
                console.log("start voice");
              }}
            />
          )}
        </div>
      </div>
      {showExport && (
        <ExportMessageModal onClose={() => setShowExport(false)} />
      )}

      {isEditingMessage && (
        <EditMessageModal
          onClose={() => {
            setIsEditingMessage(false);
          }}
        />
      )}

      {showShortcutKeyModal && (
        <ShortcutKeyModal onClose={() => setShowShortcutKeyModal(false)} />
      )}

      {showWebSearchConfigModal && (
        <WebSearchConfigModal
          onClose={() => setShowWebSearchConfigModal(false)}
        />
      )}

      {showFileEditModal && editingFile && (
        <div className="modal-mask">
          <Modal
            title={`编辑文件内容: ${editingFile.name}`}
            onClose={() => setShowFileEditModal(false)}
            actions={[
              <IconButton
                text={Locale.UI.Cancel}
                icon={<CancelIcon />}
                key="cancel"
                onClick={() => {
                  setShowFileEditModal(false);
                }}
              />,
              <IconButton
                type="primary"
                text={Locale.UI.Confirm}
                icon={<ConfirmIcon />}
                key="ok"
                onClick={() => {
                  // 保存编辑后的内容
                  const updatedFiles = attachedFiles.map((file) => {
                    if (file === editingFile) {
                      // 更新文件大小
                      const newSize = new Blob([editingFile.content]).size;
                      return {
                        ...file,
                        size: newSize,
                        originalFile: new File(
                          [editingFile.content],
                          file.name,
                          { type: file.type },
                        ),
                      };
                    }
                    return file;
                  });
                  setAttachedFiles(updatedFiles);
                  setShowFileEditModal(false);
                }}
              />,
            ]}
          >
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <textarea
                style={{
                  width: "100%",
                  height: "300px",
                  padding: "8px",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  resize: "vertical",
                }}
                value={editingFile.content}
                onChange={(e) => {
                  // 更新正在编辑的文件内容
                  setEditingFile({
                    ...editingFile,
                    content: e.target.value,
                  });
                }}
              />
            </div>
          </Modal>
        </div>
      )}

      {editingImage && (
        <ImageEditor
          imageUrl={editingImage}
          onClose={() => {
            setEditingImage(null);
            setEditingImageMessageId(null); // 清除消息ID
          }}
          onSave={(editedImage) => {
            // 检查是否为附件图片
            if (attachImages.includes(editingImage)) {
              setAttachImages(
                attachImages.map((img) =>
                  img === editingImage ? editedImage : img,
                ),
              );
            }
            // 检查是否为消息中的图片
            else if (editingImageMessageId) {
              // 更新消息中的图片
              chatStore.updateTargetSession(session, (session) => {
                // 查找所有消息(包括上下文消息)
                const messages = session.mask.context.concat(session.messages);
                const messageToUpdate = messages.find(
                  (m) => m.id === editingImageMessageId,
                );

                if (messageToUpdate) {
                  // 处理两种可能的消息内容格式
                  if (typeof messageToUpdate.content === "string") {
                    // 文本消息内容 - 不应该有图片，但为防止错误进行处理
                    messageToUpdate.content = messageToUpdate.content;
                  } else if (Array.isArray(messageToUpdate.content)) {
                    // 多模态内容 - 找到并替换图片URL
                    messageToUpdate.content = messageToUpdate.content.map(
                      (item) => {
                        if (
                          item.type === "image_url" &&
                          item.image_url &&
                          item.image_url.url === editingImage
                        ) {
                          return {
                            ...item,
                            image_url: {
                              ...item.image_url,
                              url: editedImage,
                            },
                          };
                        }
                        return item;
                      },
                    );
                  }
                }
              });
            }

            setEditingImage(null);
            setEditingImageMessageId(null); // 清除消息ID
          }}
        />
      )}
    </div>
  );
}

export function ChatComponent() {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  return <Chat key={session.id} />;
}

// 添加MCP工具面板组件
function McpToolPanel(props: {
  onToolSelect: (clientId: string, toolName: string) => void;
  onClose: () => void;
}) {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // 添加这一行，引入navigate函数

  useEffect(() => {
    const loadTools = async () => {
      try {
        setLoading(true);
        const allTools = await getAllTools();
        setTools(allTools);
      } catch (error) {
        console.error("Failed to load MCP tools:", error);
        showToast("加载MCP工具失败");
      } finally {
        setLoading(false);
      }
    };

    loadTools();
  }, []);

  if (loading) {
    return (
      <div className={styles["mcp-tool-panel"]}>
        <div className={styles["mcp-tool-panel-header"]}>
          <div className={styles["mcp-tool-panel-title"]}>
            {Locale.Chat.McpTools.Title}
          </div>
          <IconButton icon={<CloseIcon />} onClick={props.onClose} />
        </div>
        <div className={styles["mcp-tool-panel-loading"]}>
          {Locale.Chat.McpTools.Loading}
        </div>
      </div>
    );
  }

  return (
    <div className={styles["mcp-tool-panel"]}>
      <div className={styles["mcp-tool-panel-header"]}>
        <div className={styles["mcp-tool-panel-title"]}>
          {Locale.Chat.McpTools.Title}
        </div>
        <IconButton icon={<CloseIcon />} onClick={props.onClose} />
      </div>
      <div className={styles["mcp-tool-panel-content"]}>
        {tools.length === 0 ? (
          <div className={styles["mcp-tool-panel-empty"]}>
            <p>{Locale.Chat.McpTools.NoTools}</p>
            <p>
              <a onClick={() => navigate(Path.McpMarket)}>
                {Locale.Chat.McpTools.AddServers}
              </a>
            </p>
          </div>
        ) : (
          tools.map((clientTools, index) => (
            <div key={index} className={styles["mcp-tool-client"]}>
              <div className={styles["mcp-tool-client-name"]}>
                {clientTools.clientId}
              </div>
              <div className={styles["mcp-tool-list"]}>
                {clientTools.tools?.tools?.map(
                  (tool: any, toolIndex: number) => (
                    <div
                      key={toolIndex}
                      className={styles["mcp-tool-item"]}
                      onClick={() =>
                        props.onToolSelect(clientTools.clientId, tool.name)
                      }
                    >
                      <div className={styles["mcp-tool-name"]}>{tool.name}</div>
                      <div className={styles["mcp-tool-description"]}>
                        {tool.description}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
