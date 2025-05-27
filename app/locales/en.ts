import { getClientConfig } from "../config/client";
import { SubmitKey } from "../store/config";
import { LocaleType } from "./index";
// if you are adding a new translation, please use PartialLocaleType instead of LocaleType

const isApp = !!getClientConfig()?.isApp;
const en: LocaleType = {
  WIP: "Coming Soon...",
  Error: {
    Unauthorized: isApp
      ? `😆 Oops, there's an issue. No worries:
     \\ 1️⃣ Want to use your own API resources? [Click here](/#/settings) to change settings ⚙️`
      : `😆 Oops, there's an issue. Let's fix it:
     \ 1️⃣ [Click here](/#/auth) to enter your key 🔑
     \ 2️⃣ Want to use your own API resources? [Click here](/#/settings) to change settings ⚙️
     `,
  },
  Auth: {
    Return: "Return",
    Title: "Need Access Code",
    Tips: "Please enter access code below",
    SubTips: "Or enter your OpenAI or Google API Key",
    Input: "access code",
    Confirm: "Confirm",
    Later: "Later",
  },
  ChatItem: {
    ChatItemCount: (count: number) => `${count} messages`,
  },
  Chat: {
    SubTitle: (count: number) => `${count} messages`,
    EditMessage: {
      Title: "Edit All Messages",
      Topic: {
        Title: "Topic",
        SubTitle: "Change the current topic",
      },
    },
    Actions: {
      ChatList: "Go To Chat List",
      CompressedHistory: "Compressed History Memory Prompt",
      Export: "Export All Messages as Markdown",
      Copy: "Copy",
      Stop: "Stop",
      Retry: "Retry",
      Pin: "Pin",
      PinToastContent: "Pinned 1 messages to contextual prompts",
      PinToastAction: "View",
      Delete: "Delete",
      Edit: "Edit",
      FullScreen: "FullScreen",
      RefreshTitle: "Refresh Title",
      RefreshToast: "Title refresh request sent",
      Speech: "Play",
      StopSpeech: "Stop",
    },
    Commands: {
      new: "Start a new chat",
      newm: "Start a new chat with mask",
      next: "Next Chat",
      prev: "Previous Chat",
      clear: "Clear Context",
      fork: "Copy Chat",
      del: "Delete Chat",
    },
    InputActions: {
      Stop: "Stop",
      ToBottom: "To Latest",
      Theme: {
        auto: "Auto",
        light: "Light Theme",
        dark: "Dark Theme",
      },
      Prompt: "Prompts",
      Masks: "Masks",
      Clear: "Clear Context",
      Settings: "Settings",
      UploadImage: "Upload Images",
      Search: "Web Search",
    },
    Rename: "Rename Chat",
    Typing: "Typing…",
    Input: (submitKey: string) => {
      var inputHints = `${submitKey} to send`;
      if (submitKey === String(SubmitKey.Enter)) {
        inputHints += ", Shift + Enter to wrap";
      }
      return inputHints;
    },
    MobileInput: "Type a message...",
    Send: "Send",
    StartSpeak: "Start Speak",
    StopSpeak: "Stop Speak",
    Config: {
      Reset: "Reset to Default",
      SaveAs: "Save as Mask",
    },
    IsContext: "Contextual Prompt",
    ShortcutKey: {
      Title: "Keyboard Shortcuts",
      newChat: "Open New Chat",
      focusInput: "Focus Input Field",
      copyLastMessage: "Copy Last Reply",
      copyLastCode: "Copy Last Code Block",
      showShortcutKey: "Show Shortcuts",
    },
    TokenInfo: {
      TokenCount: (count: number) => `${count} Tokens`,
      FirstDelay: (delay: number) => `First Response: ${delay}ms`,
    },
  },
  Export: {
    Title: "Export Messages",
    Copy: "Copy All",
    Download: "Download",
    MessageFromYou: "Message From You",
    MessageFromChatGPT: "Message From ChatGPT",
    Share: "Share to ShareGPT",
    Format: {
      Title: "Export Format",
      SubTitle: "Markdown or PNG Image",
    },
    IncludeContext: {
      Title: "Including Context",
      SubTitle: "Export context prompts in mask or not",
    },
    Steps: {
      Select: "Select",
      Preview: "Preview",
    },
    Image: {
      Toast: "Capturing Image...",
      Modal: "Long press or right click to save image",
    },
    Artifacts: {
      Title: "Share Artifacts",
      Error: "Share Error",
    },
  },
  Select: {
    Search: "Search",
    All: "Select All",
    Latest: "Select Latest",
    Clear: "Clear",
  },
  Memory: {
    Title: "Memory Prompt",
    EmptyContent: "Nothing yet.",
    Send: "Send Memory",
    Copy: "Copy Memory",
    Reset: "Reset Session",
    ResetConfirm:
      "Resetting will clear the current conversation history and historical memory. Are you sure you want to reset?",
  },
  Home: {
    NewChat: "New Chat",
    DeleteChat: "Confirm to delete the selected conversation?",
    DeleteToast: "Chat Deleted",
    Revert: "Revert",
  },
  Settings: {
    Title: "Settings",
    SubTitle: "All Settings",
    ShowPassword: "ShowPassword",
    Danger: {
      Reset: {
        Title: "Reset All Settings",
        SubTitle: "Reset all setting items to default",
        Action: "Reset",
        Confirm: "Confirm to reset all settings to default?",
      },
      Clear: {
        Title: "Clear All Data",
        SubTitle: "Clear all messages and settings",
        Action: "Clear",
        Confirm: "Confirm to clear all messages and settings?",
      },
    },
    Lang: {
      Name: "Language", // ATTENTION: if you wanna add a new translation, please do not translate this value, leave it as `Language`
      All: "All Languages",
    },
    FontSize: {
      Title: "Font Size",
      SubTitle: "Adjust font size of chat content",
    },
    FontFamily: {
      Title: "Chat Font Family",
      SubTitle:
        "Font Family of the chat content, leave empty to apply global default font",
      Placeholder: "Font Family Name",
    },
    InjectSystemPrompts: {
      Title: "Inject System Prompts",
      SubTitle: "Inject a global system prompt for every request",
    },
    InputTemplate: {
      Title: "Input Template",
      SubTitle: "Newest message will be filled to this template",
    },

    Update: {
      Version: (x: string) => `Version: ${x}`,
      IsLatest: "Latest version",
      CheckUpdate: "Check Update",
      IsChecking: "Checking update...",
      FoundUpdate: (x: string) => `Found new version: ${x}`,
      GoToUpdate: "Update",
      Success: "Update Successful.",
      Failed: "Update Failed.",
    },
    SendKey: "Send Key",
    Theme: "Theme",
    TightBorder: "Tight Border",
    SendPreviewBubble: {
      Title: "Send Preview Bubble",
      SubTitle: "Preview markdown in bubble",
    },
    AutoGenerateTitle: {
      Title: "Auto Generate Title",
      SubTitle: "Generate a suitable title based on the conversation content",
    },
    Sync: {
      CloudState: "Last Update",
      NotSyncYet: "Not sync yet",
      Success: "Sync Success",
      Fail: "Sync Fail",

      Config: {
        Modal: {
          Title: "Config Sync",
          Check: "Check Connection",
        },
        SyncType: {
          Title: "Sync Type",
          SubTitle: "Choose your favorite sync service",
        },
        Proxy: {
          Title: "Enable CORS Proxy",
          SubTitle: "Enable a proxy to avoid cross-origin restrictions",
        },
        ProxyUrl: {
          Title: "Proxy Endpoint",
          SubTitle:
            "Only applicable to the built-in CORS proxy for this project",
        },

        WebDav: {
          Endpoint: "WebDAV Endpoint",
          UserName: "User Name",
          Password: "Password",
        },

        UpStash: {
          Endpoint: "UpStash Redis REST Url",
          UserName: "Backup Name",
          Password: "UpStash Redis REST Token",
        },
      },

      LocalState: "Local Data",
      Overview: (overview: any) => {
        return `${overview.chat} chats，${overview.message} messages，${overview.prompt} prompts，${overview.mask} masks`;
      },
      ImportFailed: "Failed to import from file",
    },
    Mask: {
      Splash: {
        Title: "Mask Splash Screen",
        SubTitle: "Show a mask splash screen before starting new chat",
      },
      Builtin: {
        Title: "Hide Builtin Masks",
        SubTitle: "Hide builtin masks in mask list",
      },
    },
    Prompt: {
      Disable: {
        Title: "Disable auto-completion",
        SubTitle: "Input / to trigger auto-completion",
      },
      List: "Prompt List",
      ListCount: (builtin: number, custom: number) =>
        `${builtin} built-in, ${custom} user-defined`,
      Edit: "Edit",
      Modal: {
        Title: "Prompt List",
        Add: "Add One",
        Search: "Search Prompts",
      },
      EditModal: {
        Title: "Edit Prompt",
      },
    },
    HistoryCount: {
      Title: "Attached Messages Count",
      SubTitle: "Number of sent messages attached per request",
    },
    CompressThreshold: {
      Title: "History Compression Threshold",
      SubTitle:
        "Will compress if uncompressed messages length exceeds the value",
    },

    Usage: {
      Title: "Account Balance",
      SubTitle(used: any, total: any) {
        return `Used this month $${used}, subscription $${total}`;
      },
      IsChecking: "Checking...",
      Check: "Check",
      NoAccess: "Enter API Key to check balance",
    },
    Access: {
      AccessCode: {
        Title: "Access Code",
        SubTitle: "Access control Enabled",
        Placeholder: "Enter Code",
      },
      CustomEndpoint: {
        Title: "Custom Endpoint",
        SubTitle: "Use custom Azure or OpenAI service",
      },
      Provider: {
        Title: "Model Provider",
        SubTitle: "Select Azure or OpenAI",
      },
      OpenAI: {
        ApiKey: {
          Title: "OpenAI API Key",
          SubTitle: "User custom OpenAI Api Key",
          Placeholder: "sk-xxx",
        },

        Endpoint: {
          Title: "OpenAI Endpoint",
          SubTitle: "Must start with http(s):// or use /api/openai as default",
        },
      },
      Azure: {
        ApiKey: {
          Title: "Azure Api Key",
          SubTitle: "Check your api key from Azure console",
          Placeholder: "Azure Api Key",
        },

        Endpoint: {
          Title: "Azure Endpoint",
          SubTitle: "Example: ",
        },

        ApiVerion: {
          Title: "Azure Api Version",
          SubTitle: "Check your api version from azure console",
        },
      },
      Anthropic: {
        ApiKey: {
          Title: "Anthropic API Key",
          SubTitle:
            "Use a custom Anthropic Key to bypass password access restrictions",
          Placeholder: "Anthropic API Key",
        },

        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },

        ApiVerion: {
          Title: "API Version (claude api version)",
          SubTitle: "Select and input a specific API version",
        },
      },
      Baidu: {
        ApiKey: {
          Title: "Baidu API Key",
          SubTitle: "Use a custom Baidu API Key",
          Placeholder: "Baidu API Key",
        },
        SecretKey: {
          Title: "Baidu Secret Key",
          SubTitle: "Use a custom Baidu Secret Key",
          Placeholder: "Baidu Secret Key",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "not supported, configure in .env",
        },
      },
      Tencent: {
        ApiKey: {
          Title: "Tencent API Key",
          SubTitle: "Use a custom Tencent API Key",
          Placeholder: "Tencent API Key",
        },
        SecretKey: {
          Title: "Tencent Secret Key",
          SubTitle: "Use a custom Tencent Secret Key",
          Placeholder: "Tencent Secret Key",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "not supported, configure in .env",
        },
      },
      ByteDance: {
        ApiKey: {
          Title: "ByteDance API Key",
          SubTitle: "Use a custom ByteDance API Key",
          Placeholder: "ByteDance API Key",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },
      },
      Alibaba: {
        ApiKey: {
          Title: "Alibaba API Key",
          SubTitle: "Use a custom Alibaba Cloud API Key",
          Placeholder: "Alibaba Cloud API Key",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },
      },
      Moonshot: {
        ApiKey: {
          Title: "Moonshot API Key",
          SubTitle: "Use a custom Moonshot API Key",
          Placeholder: "Moonshot API Key",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },
      },
      XAI: {
        ApiKey: {
          Title: "XAI API Key",
          SubTitle: "Use a custom XAI API Key",
          Placeholder: "XAI API Key",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },
      },
      ChatGLM: {
        ApiKey: {
          Title: "ChatGLM API Key",
          SubTitle: "Use a custom ChatGLM API Key",
          Placeholder: "ChatGLM API Key",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },
      },
      Stability: {
        ApiKey: {
          Title: "Stability API Key",
          SubTitle: "Use a custom Stability API Key",
          Placeholder: "Stability API Key",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },
      },
      Iflytek: {
        ApiKey: {
          Title: "Iflytek API Key",
          SubTitle: "Use a Iflytek API Key",
          Placeholder: "Iflytek API Key",
        },
        ApiSecret: {
          Title: "Iflytek API Secret",
          SubTitle: "Use a Iflytek API Secret",
          Placeholder: "Iflytek API Secret",
        },
        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },
      },
      CustomModel: {
        Title: "Custom Models",
        SubTitle: "Custom model options, seperated by comma",
        ModelSelector: "Select Models",
        FetchModels: "Load Models",
        FetchSuccessFromClient: (count: number) =>
          `Successfully fetched ${count} models from client configuration`,
        FetchSuccessFromServer: (count: number) =>
          `Successfully fetched ${count} models from server configuration`,
        FetchFailedFromClient: (error: string) =>
          `Failed to fetch models from client configuration: ${error}`,
        FetchFailedFromServer: (error: string) =>
          `Failed to fetch models from server configuration: ${error}`,
        ApiKeyRequired: "Please set API key first",
        InvalidResponse: "Invalid response format",
        RequestFailed: (status: number) => `Request failed: ${status}`,
        InputPlaceholder: "Enter custom model name and press Enter to add",
        SelectAll: "Select All",
        SelectNone: "Select None",
        ModelExists: "Model already exists",
        EditCategories: "Edit Model Categories",
        CategoryName: "Category Name",
        MatchKeyword: "Match Keyword",
        AddCategory: "Add",
        CategoryTip:
          'Match keyword will be used to identify model categories, e.g. "gpt" will match all models containing "gpt"',
        ExistingCategories: "Existing Custom Categories",
        NoCustomCategories: "No custom categories yet",
        InputPlaceholderEnter: "Enter custom model name and press Enter to add",
        RefreshModels: "Refresh Models",
        ModelNameLabel: "Model Name",
        MatchRule: "Match Rule",
        RestoreDefaults: "Restore Defaults",
        DeleteConfirm: "Confirm to delete this model?",
        AuthRequired: "Please enter access password in settings first",
        SaveEditFailed: "Failed to update local storage",
        DeleteModelSuccess: "Model deleted from local storage",
        DeleteModelFailed: "Failed to update local storage",
        ModelNotFound: "Model not found for deletion",
        ModelNotFoundInList: "Model not found in complete model list",
        EditModelNotFound: "Model not found for editing",
        EditModelNotFoundInList:
          "Model not found in complete model list for editing",
        FetchFailed: "Failed to fetch model list",
        RestoreRulesSuccess: "Default matching rules restored",
        RestoreRulesFailed: "Failed to restore default matching rules",
        MatchPrefix: "Match",
        ModelCategory: "Model Category",
        ModelCategoryOther: "Other",
        TestModel: "Test Models",
        Testing: "Testing...",
        TestStart: "Starting to test {0} models...",
        TestSuccess: "{0}: Test successful ({1}ms)",
        TestFailed: "{0}: Test failed",
        TestComplete: "Test complete: {0}/{1} models available",
        TestError: "Test error: {0}",
        SelectModelsToTest: "Please select models to test first",
        Unavailable: "Unavailable",
        NoModelsToTest: "No models to test currently",
        TestButton: "Test",
        TestTimeout: "Timeout",
        TestUnavailable: "Failed",
        TestButtonTooltip: "Click to test this model",
        RetestButtonTooltip: "Click to retest this model",
        TestStartMessage: "Starting to test model: {0}...",
        TestSuccessMessage: "{0}: Test successful ({1}s)",
        TestTimeoutMessage: "{0}: Timeout",
        TestErrorMessage: "{0}: {1}",
        TestErrorPrefix: "Test error: ",
        ServerTestFailedError: "Server test failed: {0}",
        UpdateStorageFailedError: "Failed to update local storage",
        DefaultTestFailedMessage: "Test failed",
        TestAllModelsStart: "Starting to test {0} models...",
        StopTest: "Stop Testing",
        TestAll: "Test All",
        TestStopped: "Testing stopped",
        TestCompleteMessage: "Test complete: {0}/{1} models available",
        TimeoutOptions: {
          FiveSeconds: "5s",
          SixSeconds: "6s",
          SevenSeconds: "7s",
          EightSeconds: "8s",
          NineSeconds: "9s",
          TenSeconds: "10s",
        },
      },
      Google: {
        ApiKey: {
          Title: "API Key",
          SubTitle: "Obtain your API Key from Google AI",
          Placeholder: "Google AI API Key",
        },

        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example: ",
        },

        ApiVersion: {
          Title: "API Version (specific to gemini-pro)",
          SubTitle: "Select a specific API version",
        },
        GoogleSafetySettings: {
          Title: "Google Safety Settings",
          SubTitle: "Select a safety filtering level",
        },
      },
    },

    Model: "Model",
    CompressModel: {
      Title: "Summary Model",
      SubTitle: "Model used to compress history and generate title",
    },
    Temperature: {
      Title: "Temperature",
      SubTitle: "A larger value makes the more random output",
    },
    TopP: {
      Title: "Top P",
      SubTitle: "Do not alter this value together with temperature",
    },
    MaxTokens: {
      Title: "Max Tokens",
      SubTitle: "Maximum length of input tokens and generated tokens",
    },
    PresencePenalty: {
      Title: "Presence Penalty",
      SubTitle:
        "A larger value increases the likelihood to talk about new topics",
    },
    FrequencyPenalty: {
      Title: "Frequency Penalty",
      SubTitle:
        "A larger value decreasing the likelihood to repeat the same line",
    },
    TTS: {
      Enable: {
        Title: "Enable TTS",
        SubTitle: "Enable text-to-speech service",
      },
      Autoplay: {
        Title: "Enable Autoplay",
        SubTitle:
          "Automatically generate speech and play, you need to enable the text-to-speech switch first",
      },
      Model: "Model",
      Voice: {
        Title: "Voice",
        SubTitle: "The voice to use when generating the audio",
      },
      Speed: {
        Title: "Speed",
        SubTitle: "The speed of the generated audio",
      },
      Engine: "TTS Engine",
    },
    Realtime: {
      Enable: {
        Title: "Realtime Chat",
        SubTitle: "Enable realtime chat feature",
      },
      Provider: {
        Title: "Model Provider",
        SubTitle: "Switch between different providers",
      },
      Model: {
        Title: "Model",
        SubTitle: "Select a model",
      },
      ApiKey: {
        Title: "API Key",
        SubTitle: "API Key",
        Placeholder: "API Key",
      },
      Azure: {
        Endpoint: {
          Title: "Endpoint",
          SubTitle: "Endpoint",
        },
        Deployment: {
          Title: "Deployment Name",
          SubTitle: "Deployment Name",
        },
      },
      Temperature: {
        Title: "Randomness (temperature)",
        SubTitle: "Higher values result in more random responses",
      },
    },
    EnableModelSearch: "Enable Model Search",
    EnableModelSearchSubTitle:
      "Enable to search and filter when selecting models",
    EnableThemeChange: {
      Title: "Enable Theme Switch",
      SubTitle: "Show theme switch button in chat",
    },
    EnablePromptHints: {
      Title: "Enable Prompt Hints Feature",
      SubTitle:
        "When enabled, you can trigger prompts with /, when disabled, the prompt feature will be completely turned off",
    },
    EnableClearContext: {
      Title: "Enable Clear Context",
      SubTitle: "Show clear context button in chat",
    },
    EnablePlugins: {
      Title: "Enable Plugins",
      SubTitle: "Show plugins button in chat",
    },
    EnableShortcuts: {
      Title: "Enable Shortcuts",
      SubTitle: "Show shortcuts button in chat",
    },
  },
  Store: {
    DefaultTopic: "New Conversation",
    BotHello: "Hello! How can I assist you today?",
    Error: "Something went wrong, please try again later.",
    Prompt: {
      History: (content: string) =>
        "This is a summary of the chat history as a recap: " + content,
      Topic:
        "Please generate a four to five word title summarizing our conversation without any lead-in, punctuation, quotation marks, periods, symbols, bold text, or additional text. Remove enclosing quotation marks.",
      Summarize:
        "Summarize the discussion briefly in 200 words or less to use as a prompt for future context.",
    },
  },
  Copy: {
    Success: "Copied to clipboard",
    Failed: "Copy failed, please grant permission to access clipboard",
  },
  Download: {
    Success: "Content downloaded to your directory.",
    Failed: "Download failed.",
  },
  Context: {
    Toast: (x: any) => `With ${x} contextual prompts`,
    Edit: "Current Chat Settings",
    Add: "Add a Prompt",
    Clear: "Context Cleared",
    Revert: "Revert",
  },
  Discovery: {
    Name: "Discovery",
  },
  Mcp: {
    Name: "MCP",
    Market: {
      Title: "MCP Market",
      SubTitle: (count: number) => `${count} servers configured`,
      Loading: "Loading preset server list...",
      NoServers: "No servers available",
      SearchPlaceholder: "Search MCP Server",
      Status: {
        Active: "Running",
        Paused: "Stopped",
        Error: "Error",
        Initializing: "Initializing",
        Undefined: "Undefined",
      },
      Actions: {
        Add: "Add",
        Configure: "Configure",
        Start: "Start",
        Stop: "Stop",
        Tools: "Tools",
        RestartAll: "Restart All",
      },
      Operations: {
        Starting: "Starting server...",
        Stopping: "Stopping server...",
        Updating: "Updating configuration...",
        Creating: "Creating MCP client...",
      },
      ConfigModal: {
        Title: "Configure Server - ",
        Save: "Save",
        Cancel: "Cancel",
        InputPlaceholder: "Enter {0}",
        AddItem: "Add {0}",
      },
      ToolsModal: {
        Title: "Server Details - ",
        Close: "Close",
        NoTools: "No tools available",
        Loading: "Loading...",
      },
      Errors: {
        LoadFailed: "Failed to load preset servers",
        InitFailed: "Failed to load initial state",
        SaveFailed: "Failed to save configuration",
        StartFailed: "Failed to start server, please check logs",
        StopFailed: "Failed to stop server",
        ToolsLoadFailed: "Failed to load tools",
        ConfigUpdateSuccess: "Server configuration updated successfully",
        StopSuccess: "Server stopped successfully",
        RestartSuccess: "Restarting all clients",
        RestartFailed: "Failed to restart clients",
      },
    },
  },
  FineTuned: {
    Sysmessage: "You are an assistant that",
  },
  SearchChat: {
    Name: "Search",
    Page: {
      Title: "Search Chat History",
      Search: "Enter search query to search chat history",
      NoResult: "No results found",
      NoData: "No data",
      Loading: "Loading...",

      SubTitle: (count: number) => `Found ${count} results`,
    },
    Item: {
      View: "View",
    },
  },
  Plugin: {
    Name: "Plugins",
    EnableWeb: "Enable Web Access",
    Page: {
      Title: "Plugins",
      SubTitle: (count: number) => `${count} plugins`,
      Search: "Search Plugin",
      Create: "Create",
      Find: "You can find awesome plugins on github: ",
    },
    Item: {
      Info: (count: number) => `${count} method`,
      View: "View",
      Edit: "Edit",
      Delete: "Delete",
      DeleteConfirm: "Confirm to delete?",
    },
    Auth: {
      None: "None",
      Basic: "Basic",
      Bearer: "Bearer",
      Custom: "Custom",
      CustomHeader: "Parameter Name",
      Token: "Token",
      Proxy: "Using Proxy",
      ProxyDescription: "Using proxies to solve CORS error",
      Location: "Location",
      LocationHeader: "Header",
      LocationQuery: "Query",
      LocationBody: "Body",
    },
    EditModal: {
      Title: (readonly: boolean) =>
        `Edit Plugin ${readonly ? "(readonly)" : ""}`,
      Download: "Download",
      Auth: "Authentication Type",
      Content: "OpenAPI Schema",
      Load: "Load From URL",
      Method: "Method",
      Error: "OpenAPI Schema Error",
    },
  },
  Mask: {
    Name: "Mask",
    Page: {
      Title: "Prompt Template",
      SubTitle: (count: number) => `${count} prompt templates`,
      Search: "Search Templates",
      Create: "Create",
    },
    Item: {
      Info: (count: number) => `${count} prompts`,
      Chat: "Chat",
      View: "View",
      Edit: "Edit",
      Delete: "Delete",
      DeleteConfirm: "Confirm to delete?",
    },
    EditModal: {
      Title: (readonly: boolean) =>
        `Edit Prompt Template ${readonly ? "(readonly)" : ""}`,
      Download: "Download",
      Clone: "Clone",
    },
    Config: {
      Avatar: "Bot Avatar",
      Name: "Bot Name",
      Sync: {
        Title: "Use Global Config",
        SubTitle: "Use global config in this chat",
        Confirm: "Confirm to override custom config with global config?",
      },
      HideContext: {
        Title: "Hide Context Prompts",
        SubTitle: "Do not show in-context prompts in chat",
      },
      Artifacts: {
        Title: "Enable Artifacts",
        SubTitle: "Can render HTML page when enable artifacts.",
      },
      CodeFold: {
        Title: "Enable CodeFold",
        SubTitle:
          "Automatically collapse/expand overly long code blocks when CodeFold is enabled",
      },
      Share: {
        Title: "Share This Mask",
        SubTitle: "Generate a link to this mask",
        Action: "Copy Link",
      },
    },
  },
  NewChat: {
    Return: "Return",
    Skip: "Just Start",
    Title: "Pick a Mask",
    SubTitle: "Chat with the Soul behind the Mask",
    More: "Find More",
    NotShow: "Never Show Again",
    ConfirmNoShow: "Confirm to disable？You can enable it in settings later.",
    Thinking: "Thinking...",
    Think: "Deep Thought",
    ThinkingTime: (seconds: number) => ` (took ${seconds} seconds)`,
  },

  UI: {
    Confirm: "Confirm",
    Cancel: "Cancel",
    Close: "Close",
    Create: "Create",
    Edit: "Edit",
    Export: "Export",
    Import: "Import",
    Sync: "Sync",
    Config: "Config",
    Search: "Search",
    All: "All",
  },
  Exporter: {
    Description: {
      Title: "Only messages after clearing the context will be displayed",
    },
    Model: "Model",
    Messages: "Messages",
    Topic: "Topic",
    Time: "Time",
  },
  URLCommand: {
    Code: "Detected access code from url, confirm to apply? ",
    Settings: "Detected settings from url, confirm to apply?",
  },
  SdPanel: {
    Prompt: "Prompt",
    NegativePrompt: "Negative Prompt",
    PleaseInput: (name: string) => `Please input ${name}`,
    AspectRatio: "Aspect Ratio",
    ImageStyle: "Image Style",
    OutFormat: "Output Format",
    AIModel: "AI Model",
    ModelVersion: "Model Version",
    Submit: "Submit",
    ParamIsRequired: (name: string) => `${name} is required`,
    Styles: {
      D3Model: "3d-model",
      AnalogFilm: "analog-film",
      Anime: "anime",
      Cinematic: "cinematic",
      ComicBook: "comic-book",
      DigitalArt: "digital-art",
      Enhance: "enhance",
      FantasyArt: "fantasy-art",
      Isometric: "isometric",
      LineArt: "line-art",
      LowPoly: "low-poly",
      ModelingCompound: "modeling-compound",
      NeonPunk: "neon-punk",
      Origami: "origami",
      Photographic: "photographic",
      PixelArt: "pixel-art",
      TileTexture: "tile-texture",
    },
  },
  Sd: {
    SubTitle: (count: number) => `${count} images`,
    Actions: {
      Params: "See Params",
      Copy: "Copy Prompt",
      Delete: "Delete",
      Retry: "Retry",
      ReturnHome: "Return Home",
      History: "History",
    },
    EmptyRecord: "No images yet",
    Status: {
      Name: "Status",
      Success: "Success",
      Error: "Error",
      Wait: "Waiting",
      Running: "Running",
    },
    Danger: {
      Delete: "Confirm to delete?",
    },
    GenerateParams: "Generate Params",
    Detail: "Detail",
  },
} as const;

export default en;
