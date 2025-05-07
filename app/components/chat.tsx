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
      className={clsx(styles["chat-input-action"], "clickable")}
      onClick={() => {
        props.onClick();
        setTimeout(updateWidth, 1);
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
          text={"上传附件"}
          icon={props.uploading ? <LoadingButtonIcon /> : <AttachmentIcon />}
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
            text={`MCP工具${mcpToolsCount > 0 ? ` (${mcpToolsCount})` : ""}`}
            icon={<McpToolIcon />}
          />
        )}

        {!isMobileScreen && config.enableShortcuts && (
          <ChatAction
            onClick={() => props.setShowShortcutKeyModal(true)}
            text={Locale.Chat.ShortcutKey.Title}
            icon={<ShortcutkeyIcon />}
          />
        )}
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

  const doSubmit = (userInput: string) => {
    if (
      userInput.trim() === "" &&
      isEmpty(attachImages) &&
      attachedFiles.length === 0
    )
      return;

    // 检查是否有长文本需要转换为文件
    let finalUserInput = userInput;
    const MAX_TEXT_LENGTH = 3000; // 最大文本长度

    if (userInput.length > MAX_TEXT_LENGTH) {
      // 将长文本转换为文件附件
      const longTextFile: FileInfo = {
        name: "长文本.txt",
        type: "text/plain",
        size: userInput.length,
        content: userInput,
        originalFile: new File([userInput], "长文本.txt", {
          type: "text/plain",
        }),
      };

      // 添加到文件附件列表
      setAttachedFiles([...attachedFiles, longTextFile]);

      // 替换用户输入为提示信息
      finalUserInput = "我发送了一个长文本文件，内容已自动转换为附件。";

      // 显示提示
      showToast("文本过长，已自动转换为文件附件");
    }

    // 如果有附加文件，将文件信息添加到用户输入
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

    // 判断是否应该使用MCP工具
    const shouldUseTool = shouldUseMcpTool(finalUserInput);

    // 获取最后一条消息
    const lastMessage = session.messages[session.messages.length - 1];

    // 如果应该使用工具但最后一条消息没有使用工具，提示用户
    if (
      shouldUseTool &&
      lastMessage &&
      lastMessage.role === "assistant" &&
      !messageContainsMcpCall(lastMessage)
    ) {
      // 修改用户输入，添加明确的MCP调用提示
      finalUserInput = `请使用适当的MCP工具来回答以下问题:\n\n${finalUserInput}`;
      // 也可以选择显示提示而不修改输入
      // showToast("您的问题可以使用MCP工具获得更准确的回答");
    }

    // 检查是否是工具命令
    const commandMatch = Object.keys(mcpToolCommands).find((cmd) =>
      finalUserInput.trim().startsWith(cmd),
    );

    if (commandMatch) {
      const { clientId, toolName } = mcpToolCommands[commandMatch];
      const params = finalUserInput.substring(commandMatch.length).trim();

      // 构建明确的工具使用提示
      finalUserInput = `请使用 ${clientId} 客户端的 ${toolName} 工具${
        params ? `，参数是: ${params}` : ""
      }`;
    }

    setIsLoading(true);
    chatStore
      .onUserInput(finalUserInput, attachImages)
      .then(() => setIsLoading(false));

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
        if (m.isError || new Date(m.date).getTime() < stopTiming) {
          if (m.streaming) {
            m.streaming = false;
          }

          if (m.content.length === 0) {
            m.isError = true;
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
    if (selectOrCopy(e.currentTarget, getMessageTextContent(message))) {
      if (userInput.length === 0) {
        setUserInput(getMessageTextContent(message));
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
    const textContent = getMessageTextContent(userMessage);
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
      .concat(
        isLoading
          ? [
              {
                ...createMessage({
                  role: "assistant",
                  content: "……",
                }),
                preview: true,
              },
            ]
          : [],
      )
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
          showToast("最多只能上传3张图片");
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
          showToast("最多只能上传5个文件");
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
                    `\n\n[文件过大，已截断。原文件大小: ${text.length} 字符]`
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
          showToast("读取文件失败");
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
          showToast("最多只能上传5个文件");
          return;
        }

        // 截断过长的文本内容
        const maxLength = 100000;
        const truncatedText =
          text.length > maxLength
            ? text.substring(0, maxLength) +
              `\n\n[文件过大，已截断。原文件大小: ${text.length} 字符]`
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

        showToast("已将长文本转为附件");
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
            messages.push(`最多只能上传5个文件，已保留前5个`);
          } else if (actualFileCount > 0) {
            messages.push(`已上传 ${actualFileCount} 个文件`);
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
            messages.push(`最多只能上传3张图片，已保留前3张`);
          } else if (actualImageCount > 0) {
            messages.push(`已上传 ${actualImageCount} 张图片`);
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
        showToast("读取文件失败");
      },
      // 完成上传
      () => {
        setUploading(false);
      },
    );
  }

  // 快捷键 shortcut keys
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false);

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
        const lastNonUserMessage = messages
          .filter((message) => message.role !== "user")
          .pop();
        if (lastNonUserMessage) {
          const lastMessageContent = getMessageTextContent(lastNonUserMessage);
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
                                  getMessageTextContent(message),
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
                                      getMessageTextContent(message),
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
                          content={getMessageTextContent(message)}
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
                              setEditingImageMessageId(message.id); // 保存图片所属的消息ID
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
                                    setEditingImageMessageId(message.id); // 保存图片所属的消息ID
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
                                onClick={() => onDelete(message.id ?? i)}
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
                                    getMessageTextContent(message),
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
                                    openaiSpeech(getMessageTextContent(message))
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
          <div className={styles["mcp-tool-panel-title"]}>MCP工具</div>
          <IconButton icon={<CloseIcon />} onClick={props.onClose} />
        </div>
        <div className={styles["mcp-tool-panel-loading"]}>加载中...</div>
      </div>
    );
  }

  return (
    <div className={styles["mcp-tool-panel"]}>
      <div className={styles["mcp-tool-panel-header"]}>
        <div className={styles["mcp-tool-panel-title"]}>MCP工具</div>
        <IconButton icon={<CloseIcon />} onClick={props.onClose} />
      </div>
      <div className={styles["mcp-tool-panel-content"]}>
        {tools.length === 0 ? (
          <div className={styles["mcp-tool-panel-empty"]}>
            <p>没有可用的MCP工具</p>
            <p>
              <a onClick={() => navigate(Path.McpMarket)}>
                点击这里添加MCP服务器
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
