import { useState, useEffect, useMemo } from "react";
import { Modal, List, ListItem, showToast } from "./ui-lib";
import { IconButton } from "./button";
import LoadingIcon from "../icons/three-dots.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";
import Locale from "../locales";
import { useAccessStore } from "../store";
import CloseIcon from "../icons/close.svg";
import EditIcon from "../icons/edit.svg";
import ResetIcon from "../icons/reload.svg";
import { useServerConfigStore } from "../store/config/client-config";
import {
  getModelCategory,
  getFixedCategoryAvatar,
  DEFAULT_SYSTEM_CATEGORY_PATTERNS,
  SYSTEM_CATEGORIES_STORAGE_KEY,
} from "./emoji";
import styles from "./model-selector-modal.module.scss";
import { ModelTestButton } from "./model-test-button";
import { ModelTestResult, testModels } from "../utils/model-test";

interface ModelInfo {
  id: string;
  selected: boolean;
  isCustom?: boolean;
  tested?: boolean;
  available?: boolean;
  responseTime?: number;
  timeout?: boolean;
}

export function ModelSelectorModal(props: {
  onClose: () => void;
  onSelect: (models: string) => void;
  currentModels: string;
}) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");
  const accessStore = useAccessStore();

  // 解析当前已选模型，忽略@及其后面的类别信息
  const currentModelList = useMemo(() => {
    if (!props.currentModels) return [];

    return props.currentModels.split(",").map((m) => {
      const trimmed = m.trim();
      // 如果包含@，则只取@前面的部分
      const atIndex = trimmed.indexOf("@");
      return atIndex >= 0 ? trimmed.substring(0, atIndex) : trimmed;
    });
  }, [props.currentModels]);

  // 添加一个状态来跟踪正在编辑的模型索引
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // 添加一个状态存储编辑中的值
  const [editingValue, setEditingValue] = useState("");

  // 在组件顶部添加搜索状态
  const [searchKeyword, setSearchKeyword] = useState("");

  // 添加模型类别状态
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // 添加自定义类别状态
  const [customCategories, setCustomCategories] = useState<
    Record<string, string>
  >({});
  // 添加编辑类别模态框状态
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  // 添加新类别输入状态
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPattern, setNewCategoryPattern] = useState("");

  // 添加一个本地存储键，用于保存模型列表
  const MODELS_STORAGE_KEY = "chat-next-web-models";

  // 使用从emoji.tsx导入的DEFAULT_SYSTEM_CATEGORY_PATTERNS
  const [systemCategoryPatterns, setSystemCategoryPatterns] = useState<
    Record<string, string>
  >(DEFAULT_SYSTEM_CATEGORY_PATTERNS);

  // 添加一个状态来跟踪当前选择的超时时间
  const [testTimeout, setTestTimeout] = useState(5);

  // 在组件初始化时，尝试从本地存储加载系统类别匹配规则
  useEffect(() => {
    try {
      const storedPatterns = localStorage.getItem(
        SYSTEM_CATEGORIES_STORAGE_KEY,
      );
      if (storedPatterns) {
        const parsedPatterns = JSON.parse(storedPatterns);
        setSystemCategoryPatterns(parsedPatterns);
      }
    } catch (error) {
      console.error("从本地存储加载系统类别匹配规则失败:", error);
    }
  }, []);

  // 修改保存编辑的函数，同时保存到本地存储
  const saveSystemCategoryPattern = (category: string, pattern: string) => {
    const newPatterns = {
      ...systemCategoryPatterns,
      [category]: pattern,
    };
    setSystemCategoryPatterns(newPatterns);

    // 保存到本地存储
    try {
      localStorage.setItem(
        SYSTEM_CATEGORIES_STORAGE_KEY,
        JSON.stringify(newPatterns),
      );
    } catch (error) {
      console.error("保存系统类别匹配规则到本地存储失败:", error);
    }

    setEditingIndex(null);
  };

  // 添加恢复默认规则的函数
  const resetToDefaultPatterns = () => {
    setSystemCategoryPatterns(DEFAULT_SYSTEM_CATEGORY_PATTERNS);

    // 保存到本地存储
    try {
      localStorage.setItem(
        SYSTEM_CATEGORIES_STORAGE_KEY,
        JSON.stringify(DEFAULT_SYSTEM_CATEGORY_PATTERNS),
      );
      showToast(Locale.Settings.Access.CustomModel.RestoreRulesSuccess);
    } catch (error) {
      console.error(
        Locale.Settings.Access.CustomModel.RestoreRulesFailed,
        error,
      );
    }
  };

  // 获取可用的模型类别，按字母顺序排序，但"all"在最前，"Other"在最后
  const getAvailableCategories = useMemo(() => {
    const categories = new Set<string>();

    // 收集所有类别
    models.forEach((model) => {
      const category = getModelCategory(model.id);
      categories.add(category);
    });

    // 转换为数组
    const categoriesArray = Array.from(categories);

    // 移除"all"和"Other"（如果存在）
    const filteredCategories = categoriesArray.filter(
      (category) => category !== "all" && category !== "Other",
    );

    // 按字母顺序排序其他类别
    filteredCategories.sort((a, b) => a.localeCompare(b));

    // 构建最终数组：all在最前，排序后的类别在中间，Other在最后
    const result = ["all"];

    // 添加排序后的类别
    result.push(...filteredCategories);

    // 如果有"Other"类别，添加到最后
    if (categoriesArray.includes("Other")) {
      result.push("Other");
    }

    return result;
  }, [models, systemCategoryPatterns]);

  // 修改获取环境变量中自定义模型的函数，确保正确获取服务端配置
  const getEnvCustomModels = async (): Promise<ModelInfo[]> => {
    try {
      // 使用 fetchConfig 方法确保获取到最新配置
      const serverConfig = await useServerConfigStore.getState().fetchConfig();

      // 确保有 customModels 数据
      const customModelsStr = serverConfig.customModels || "";
      console.log("[ModelSelector] 从服务端获取的自定义模型:", customModelsStr);

      if (customModelsStr && customModelsStr.trim() !== "") {
        // 处理 -all 特殊情况
        if (customModelsStr.startsWith("-all,")) {
          const modelsStr = customModelsStr.substring(5);
          return modelsStr.split(",").map((modelStr) => {
            // 处理包含 @ 的情况，如 "model@Category"
            const [modelId] = modelStr.trim().split("@");
            return {
              id: modelId.trim(),
              selected: currentModelList.includes(modelId.trim()),
              isCustom: true,
              isFromEnv: true, // 标记为环境变量中定义的模型
            };
          });
        } else {
          // 不包含 -all 的情况
          return customModelsStr.split(",").map((modelStr) => {
            const [modelId] = modelStr.trim().split("@");
            return {
              id: modelId.trim(),
              selected: currentModelList.includes(modelId.trim()),
              isCustom: true,
              isFromEnv: true,
            };
          });
        }
      } else {
        console.log("[ModelSelector] 服务端没有配置自定义模型");
      }
    } catch (error) {
      console.error("[ModelSelector] 从环境变量获取自定义模型失败:", error);
    }

    return [];
  };

  // 修改初始化函数，确保加载自定义模型
  const fetchModels = async (forceRefresh = false) => {
    setLoading(true);

    try {
      // 尝试从本地存储加载模型列表
      const storedModels = localStorage.getItem(MODELS_STORAGE_KEY);
      const useCustomApi = accessStore.useCustomConfig;

      // 判断优先级：
      // 1. 如果强制刷新或没有本地存储，获取新数据
      // 2. 如果有本地存储且不是强制刷新，优先使用本地存储
      if (storedModels && !forceRefresh) {
        // 如果有本地存储的模型列表且不是强制刷新，则使用本地存储的数据
        const parsedModels = JSON.parse(storedModels);

        // 确保保留测试结果相关字段
        const modelsWithTestResults = parsedModels.map((model: ModelInfo) => ({
          ...model,
          selected: currentModelList.includes(model.id),
          // 保留测试相关字段
          tested: model.tested || false,
          available: model.available,
          responseTime: model.responseTime,
          timeout: model.timeout,
        }));

        setModels(modelsWithTestResults);
        setLoading(false);
        return;
      }

      // 策略：准备三个来源的模型列表，然后根据优先级合并
      let apiModelList: ModelInfo[] = []; // API返回的模型
      let customModelList: ModelInfo[] = []; // 用户自定义的模型
      let envModelList: ModelInfo[] = []; // 环境变量中的模型

      // 1. 获取环境变量中的自定义模型
      envModelList = await getEnvCustomModels();

      // 2. 获取用户选择的自定义模型
      // 从当前模型列表中提取自定义模型（除了 -all）
      customModelList = currentModelList
        .filter((id) => id !== "-all")
        .map((id) => ({
          id,
          selected: true,
          isCustom: true,
        }));

      // 3. 如果用户配置了自定义API，则从用户配置的API获取模型
      if (useCustomApi) {
        // 使用客户端配置
        const baseUrl = accessStore.openaiUrl || "https://api.openai.com";
        const apiKey = accessStore.openaiApiKey;

        if (!apiKey) {
          showToast(Locale.Settings.Access.CustomModel.ApiKeyRequired);

          // 即便没有API密钥，也可以继续处理环境变量模型和自定义模型
          const allModels = mergeModelLists(customModelList, envModelList, []);
          setModels(allModels);

          // 保存到本地存储
          localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(allModels));

          setLoading(false);
          return;
        }

        try {
          // 使用客户端密钥直接请求
          const url = `${baseUrl}/v1/models`;
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(
              Locale.Settings.Access.CustomModel.ServerTestFailedError.replace(
                "{0}",
                response.status.toString(),
              ),
            );
          }

          const data = await response.json();

          if (data.data && Array.isArray(data.data)) {
            // 处理模型数据
            apiModelList = data.data.map((model: any) => ({
              id: model.id,
              selected: currentModelList.includes(model.id),
            }));

            // 按字母顺序排序
            apiModelList.sort((a: ModelInfo, b: ModelInfo) =>
              a.id.localeCompare(b.id),
            );

            // 合并模型列表，按优先级：自定义 > 环境变量 > API
            const allModels = mergeModelLists(
              customModelList,
              envModelList,
              apiModelList,
            );
            console.log(
              "[ModelSelector] 合并后的模型列表:",
              allModels.map((m) => m.id).join(", "),
            );
            console.log(
              "[ModelSelector] 环境变量模型:",
              envModelList.map((m) => m.id).join(", "),
            );
            console.log(
              "[ModelSelector] 用户自定义模型:",
              customModelList.map((m) => m.id).join(", "),
            );
            console.log("[ModelSelector] API模型数量:", apiModelList.length);

            setModels(allModels);

            // 保存到本地存储
            localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(allModels));

            // 显示获取到的模型数量，指明是从客户端获取的
            showToast(
              Locale.Settings.Access.CustomModel.FetchSuccessFromClient(
                apiModelList.length,
              ),
            );
          } else {
            throw new Error(Locale.Settings.Access.CustomModel.InvalidResponse);
          }
        } catch (error) {
          // 客户端错误
          console.error("从客户端获取模型列表失败:", error);
          showToast(
            Locale.Settings.Access.CustomModel.FetchFailedFromClient(
              error instanceof Error ? error.message : String(error),
            ),
          );

          // 即便API失败，也使用环境变量和自定义模型
          const allModels = mergeModelLists(customModelList, envModelList, []);
          setModels(allModels);

          // 保存到本地存储
          localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(allModels));

          setLoading(false);
          return;
        }
      } else {
        // 使用服务端配置
        try {
          // 使用统一配置管理器获取配置，避免重复请求
          const configData = await useServerConfigStore
            .getState()
            .fetchConfig();
          const baseUrl = configData.baseUrl || "https://api.openai.com";

          // 检查服务端是否设置了API密钥
          if (configData.apiKey !== "已设置") {
            showToast(Locale.Settings.Access.CustomModel.ApiKeyRequired);

            // 即便没有API密钥，也可以继续处理环境变量模型和自定义模型
            const allModels = mergeModelLists(
              customModelList,
              envModelList,
              [],
            );
            setModels(allModels);

            // 保存到本地存储
            localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(allModels));

            setLoading(false);
            return;
          }

          // 通过服务端代理请求
          const response = await fetch("/api/proxy", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: `${baseUrl}/v1/models`,
            }),
          });

          if (!response.ok) {
            throw new Error(
              Locale.Settings.Access.CustomModel.ServerTestFailedError.replace(
                "{0}",
                response.status.toString(),
              ),
            );
          }

          const data = await response.json();

          if (data.data && Array.isArray(data.data)) {
            // 处理模型数据
            apiModelList = data.data.map((model: any) => ({
              id: model.id,
              selected: currentModelList.includes(model.id),
            }));

            // 按字母顺序排序
            apiModelList.sort((a: ModelInfo, b: ModelInfo) =>
              a.id.localeCompare(b.id),
            );

            // 合并模型列表，优先级：
            // 如果用户配置了自定义接口 -> 自定义模型 > 环境变量模型 > API模型
            // 否则 -> 环境变量模型 > 自定义模型 > API模型
            const allModels = useCustomApi
              ? mergeModelLists(customModelList, envModelList, apiModelList)
              : mergeModelLists(envModelList, customModelList, apiModelList);

            console.log(
              "[ModelSelector] 合并后的模型列表:",
              allModels.map((m) => m.id).join(", "),
            );
            console.log(
              "[ModelSelector] 环境变量模型:",
              envModelList.map((m) => m.id).join(", "),
            );
            console.log(
              "[ModelSelector] 用户自定义模型:",
              customModelList.map((m) => m.id).join(", "),
            );
            console.log("[ModelSelector] API模型数量:", apiModelList.length);

            setModels(allModels);

            // 保存到本地存储
            localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(allModels));

            // 显示获取到的模型数量
            showToast(
              Locale.Settings.Access.CustomModel.FetchSuccessFromServer(
                apiModelList.length,
              ),
            );
          } else {
            throw new Error(Locale.Settings.Access.CustomModel.InvalidResponse);
          }
        } catch (error) {
          // 服务端错误
          console.error("从服务端获取模型列表失败:", error);
          showToast(
            Locale.Settings.Access.CustomModel.FetchFailedFromServer(
              error instanceof Error ? error.message : String(error),
            ),
          );

          // 即便API失败，也使用环境变量和自定义模型
          // 优先级：环境变量 > 自定义模型（因为没有使用自定义接口）
          const allModels = mergeModelLists(envModelList, customModelList, []);
          setModels(allModels);

          // 保存到本地存储
          localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(allModels));

          setLoading(false);
          return;
        }
      }
    } catch (error) {
      // 通用错误（如配置获取失败等）
      console.error(Locale.Settings.Access.CustomModel.FetchFailed, error);
      showToast(
        `获取模型列表失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  // 添加一个合并模型列表的辅助函数，按优先级合并三个来源的模型列表
  const mergeModelLists = (
    firstPriority: ModelInfo[],
    secondPriority: ModelInfo[],
    thirdPriority: ModelInfo[],
  ): ModelInfo[] => {
    // 创建ID查询表，方便快速查找
    const modelIds = new Set<string>();
    const result: ModelInfo[] = [];

    // 添加第一优先级模型
    firstPriority.forEach((model) => {
      if (!modelIds.has(model.id)) {
        result.push(model);
        modelIds.add(model.id);
      }
    });

    // 添加第二优先级模型
    secondPriority.forEach((model) => {
      if (!modelIds.has(model.id)) {
        result.push(model);
        modelIds.add(model.id);
      }
    });

    // 添加第三优先级模型
    thirdPriority.forEach((model) => {
      if (!modelIds.has(model.id)) {
        result.push(model);
        modelIds.add(model.id);
      }
    });

    return result;
  };

  useEffect(() => {
    // 确保服务端配置加载完成后再获取模型列表
    const initModels = async () => {
      // 首先确保服务端配置已加载
      await useServerConfigStore.getState().fetchConfig();
      // 然后加载模型列表
      fetchModels(false); // 传入false表示优先从本地加载
    };

    initModels();
  }, [accessStore.useCustomConfig]);

  const toggleModelSelection = (originalIndex: number) => {
    const updatedModels = [...models];
    updatedModels[originalIndex] = {
      ...updatedModels[originalIndex],
      selected: !updatedModels[originalIndex].selected,
    };
    setModels(updatedModels);

    // 更新本地存储
    try {
      localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(updatedModels));
    } catch (error) {
      console.error("更新本地存储失败:", error);
    }
  };

  const handleConfirm = () => {
    const selectedModels = models
      .filter((model) => model.selected)
      .map((model) => {
        // 获取模型类别
        const category = getModelCategory(model.id);
        // 返回格式为 modelId@Category 的字符串
        return `${model.id}@${category}`;
      })
      .join(",");

    props.onSelect(selectedModels);
    props.onClose();
  };

  // 修改全选函数，同时考虑搜索关键字和类别过滤
  const selectAll = () => {
    const filteredModelIds = models
      .filter((model) => {
        // 同时考虑搜索关键字和类别过滤
        const matchesSearch = model.id
          .toLowerCase()
          .includes(searchKeyword.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" ||
          getModelCategory(model.id) === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .map((model) => model.id);

    setModels((prevModels) =>
      prevModels.map((model) => ({
        ...model,
        selected: filteredModelIds.includes(model.id) ? true : model.selected,
      })),
    );
  };

  // 修改全不选函数，同时考虑搜索关键字和类别过滤
  const selectNone = () => {
    const filteredModelIds = models
      .filter((model) => {
        // 同时考虑搜索关键字和类别过滤
        const matchesSearch = model.id
          .toLowerCase()
          .includes(searchKeyword.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" ||
          getModelCategory(model.id) === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .map((model) => model.id);

    setModels((prevModels) =>
      prevModels.map((model) => ({
        ...model,
        selected: filteredModelIds.includes(model.id) ? false : model.selected,
      })),
    );
  };

  // 修改添加自定义模型的函数
  const addCustomModel = () => {
    if (!customModelInput.trim()) return;

    // 检查是否已存在相同ID的模型
    const exists = models.some(
      (m) => m.id.toLowerCase() === customModelInput.toLowerCase(),
    );

    if (exists) {
      showToast(Locale.Settings.Access.CustomModel.ModelExists);
      return;
    }

    // 添加新模型
    const newModel: ModelInfo = {
      id: customModelInput,
      selected: true,
      isCustom: true,
    };

    const updatedModels = [...models, newModel];
    setModels(updatedModels);
    setCustomModelInput("");

    // 更新本地存储
    try {
      localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(updatedModels));
      console.log(`已添加自定义模型到本地存储: ${newModel.id}`);
    } catch (error) {
      console.error("更新本地存储失败:", error);
    }
  };

  // 修改编辑自定义模型函数
  const startEditing = (index: number) => {
    // 获取当前显示的模型列表（考虑搜索过滤和类别过滤）
    const visibleModels = models.filter(
      (model) =>
        model.id.toLowerCase().includes(searchKeyword.toLowerCase()) &&
        (selectedCategory === "all" ||
          getModelCategory(model.id) === selectedCategory),
    );

    // 获取要编辑的模型
    const modelToEdit = visibleModels[index];

    if (!modelToEdit) {
      console.error("找不到要编辑的模型");
      return;
    }

    // 在完整模型列表中找到对应的索引
    const originalIndex = models.findIndex((m) => m.id === modelToEdit.id);

    if (originalIndex >= 0) {
      // 设置编辑索引和初始值
      setEditingIndex(originalIndex);
      setEditingValue(modelToEdit.id);
    } else {
      console.error("在完整模型列表中找不到要编辑的模型");
    }
  };

  const saveEditing = () => {
    if (editingIndex === null) return;

    const newId = editingValue.trim();
    if (!newId) {
      // 如果输入为空，则删除该模型
      deleteCustomModel(editingIndex);
    } else if (newId !== models[editingIndex].id) {
      // 检查是否与其他模型重名
      const exists = models.some(
        (m, i) => i !== editingIndex && m.id === newId,
      );
      if (exists) {
        showToast(Locale.Settings.Access.CustomModel.ModelExists);
      } else {
        // 保存修改
        setModels((prevModels) => {
          const newModels = [...prevModels];
          newModels[editingIndex] = {
            ...newModels[editingIndex],
            id: newId,
          };
          return newModels;
        });
      }
    }

    // 退出编辑模式
    setEditingIndex(null);
  };

  // 修改删除自定义模型的函数，使其能够在搜索过滤后正确删除模型
  const deleteCustomModel = (index: number) => {
    // 获取当前显示的模型列表（考虑搜索过滤和类别过滤）
    const visibleModels = models.filter(
      (model) =>
        model.id.toLowerCase().includes(searchKeyword.toLowerCase()) &&
        (selectedCategory === "all" ||
          getModelCategory(model.id) === selectedCategory),
    );

    // 获取要删除的模型
    const modelToDelete = visibleModels[index];

    if (!modelToDelete) {
      console.error("找不到要删除的模型");
      return;
    }

    // 在完整模型列表中找到对应的索引
    const originalIndex = models.findIndex((m) => m.id === modelToDelete.id);

    if (originalIndex >= 0) {
      // 从模型列表中删除
      const updatedModels = [...models];
      updatedModels.splice(originalIndex, 1);
      setModels(updatedModels);

      // 更新本地存储
      try {
        localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(updatedModels));
        console.log(`已从本地存储中删除模型: ${modelToDelete.id}`);
      } catch (error) {
        console.error("更新本地存储失败:", error);
      }
    } else {
      console.error("在完整模型列表中找不到要删除的模型");
    }
  };

  // 修改类别编辑器模态框的实现
  const addCategory = () => {
    if (!newCategoryName.trim() || !newCategoryPattern.trim()) return;

    setCustomCategories((prev) => ({
      ...prev,
      [newCategoryPattern.trim()]: newCategoryName.trim(),
    }));

    setNewCategoryName("");
    setNewCategoryPattern("");
  };

  const removeCategory = (pattern: string) => {
    setCustomCategories((prev) => {
      const newCategories = { ...prev };
      delete newCategories[pattern];
      return newCategories;
    });
  };

  // 修改"重新获取模型"按钮的处理函数
  const handleRefreshModels = () => {
    // 检查用户是否已输入访问密码
    if (!accessStore.isAuthorized()) {
      showToast(Locale.Settings.Access.CustomModel.AuthRequired);
      return;
    }

    // 强制重新加载模型，并考虑优先级逻辑
    fetchModels(true);
  };

  // 在组件内部添加一个过滤后的模型列表计算
  const filteredModels = useMemo(() => {
    return models.filter(
      (model) =>
        model.id.toLowerCase().includes(searchKeyword.toLowerCase()) &&
        (selectedCategory === "all" ||
          getModelCategory(model.id) === selectedCategory),
    );
  }, [models, searchKeyword, selectedCategory, getModelCategory]);

  // 根据响应时间返回样式类
  const getResponseTimeClass = (responseTime: number) => {
    const seconds = responseTime / 1000;
    if (seconds <= 2) {
      return `${styles.modelResponseTime} ${styles.responseTimeFast}`;
    } else if (seconds <= 5) {
      return `${styles.modelResponseTime} ${styles.responseTimeMedium}`;
    } else {
      return `${styles.modelResponseTime} ${styles.responseTimeSlow}`;
    }
  };

  // 添加一个函数来判断是否使用服务端测试
  const shouldUseServerTest = () => {
    // 如果用户没有设置自定义API配置，则使用服务端测试
    return !accessStore.useCustomConfig;
  };

  // 修改单独测试模型的函数
  const testSingleModel = async (modelId: string) => {
    showToast(
      Locale.Settings.Access.CustomModel.TestStartMessage.replace(
        "{0}",
        modelId,
      ),
    );

    try {
      let result: Record<string, ModelTestResult> = {};

      if (shouldUseServerTest()) {
        // 使用服务端测试
        const response = await fetch("/api/model-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            models: [modelId],
            timeoutSeconds: testTimeout,
          }),
        });

        if (!response.ok) {
          throw new Error(
            Locale.Settings.Access.CustomModel.ServerTestFailedError.replace(
              "{0}",
              response.status.toString(),
            ),
          );
        }

        const data = await response.json();
        result = data.results;

        // 显示测试结果消息
        if (result[modelId]) {
          if (result[modelId].success) {
            showToast(
              Locale.Settings.Access.CustomModel.TestSuccessMessage.replace(
                "{0}",
                modelId,
              ).replace(
                "{1}",
                ((result[modelId].responseTime || 0) / 1000).toFixed(2),
              ),
            );
          } else if (result[modelId].timeout) {
            showToast(
              Locale.Settings.Access.CustomModel.TestTimeoutMessage.replace(
                "{0}",
                modelId,
              ),
            );
          } else {
            // 显示详细的错误消息
            const errorMessage =
              result[modelId].message ||
              Locale.Settings.Access.CustomModel.DefaultTestFailedMessage;
            showToast(
              Locale.Settings.Access.CustomModel.TestErrorMessage.replace(
                "{0}",
                modelId,
              ).replace("{1}", errorMessage),
            );
          }
        }
      } else {
        // 使用客户端测试
        if (!accessStore.openaiApiKey) {
          showToast(Locale.Settings.Access.CustomModel.ApiKeyRequired);
          return;
        }

        const baseUrl = accessStore.openaiUrl || "https://api.openai.com";
        result = await testModels(
          [modelId],
          accessStore.openaiApiKey,
          baseUrl,
          testTimeout,
          false, // 不显示开始测试的提示
        );
      }

      // 更新模型列表
      const updatedModels = models.map((model) => {
        if (model.id === modelId && result[modelId]) {
          return {
            ...model,
            tested: true,
            available: result[modelId].success,
            responseTime: result[modelId].responseTime || 0,
            timeout: result[modelId].timeout || false,
          };
        }
        return model;
      });

      setModels(updatedModels);

      // 保存到本地存储
      try {
        localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(updatedModels));
      } catch (error) {
        console.error(
          Locale.Settings.Access.CustomModel.UpdateStorageFailedError,
          error,
        );
        showToast(
          Locale.Settings.Access.CustomModel.TestErrorPrefix +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    } catch (error) {
      console.error("测试模型时出错:", error);
      showToast(
        `测试出错: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <div className="modal-mask">
      <Modal
        title={
          <div className={styles.modelSelectorHeader}>
            <div className={styles.modelSelectorHeaderTitle}>
              {Locale.Settings.Access.CustomModel.ModelSelector}
            </div>
            <div className={styles.modelSelectorHeaderControls}>
              <div className={styles.modelSelectorHeaderSearchArea}>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder={Locale.UI.Search}
                  className={styles.modelSelectorHeaderSearchInput}
                />

                {/* 添加模型类别下拉框 */}
                {getAvailableCategories.length > 1 && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={styles.modelSelectorHeaderCategorySelect}
                  >
                    {getAvailableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category === "all"
                          ? Locale.UI.All
                          : category === "Other"
                          ? Locale.Settings.Access.CustomModel
                              .ModelCategoryOther
                          : category}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className={styles.modelSelectorHeaderButtons}>
                <IconButton
                  text={Locale.Settings.Access.CustomModel.SelectAll}
                  onClick={selectAll}
                  bordered
                />
                <IconButton
                  text={Locale.Settings.Access.CustomModel.SelectNone}
                  onClick={selectNone}
                  bordered
                />
              </div>
            </div>
          </div>
        }
        onClose={props.onClose}
        actions={[
          <div
            key="button-container"
            className={`${styles.modalButtonContainer} ${styles.modalFooter}`}
          >
            {/* 第一行：功能按钮 */}
            <div className={styles.buttonGroup}>
              <IconButton
                key="refresh-models"
                icon={<ResetIcon />}
                text={Locale.Settings.Access.CustomModel.RefreshModels}
                onClick={handleRefreshModels}
                bordered
                className={styles.responsiveButton}
              />
              <IconButton
                key="edit-categories"
                icon={<EditIcon />}
                text={Locale.Settings.Access.CustomModel.EditCategories}
                onClick={() => setShowCategoryEditor(true)}
                bordered
                className={styles.responsiveButton}
              />
            </div>

            {/* 第二行：测试和确认按钮 */}
            <div className={styles.buttonRow}>
              {/* 超时选择和测试按钮 */}
              <div className={styles.buttonGroup}>
                <ModelTestButton
                  key="test-models"
                  models={filteredModels.map((m) => m.id)}
                  onTestComplete={(
                    results: Record<string, ModelTestResult>,
                  ) => {
                    // 保留现有的完整更新逻辑
                    // ...
                  }}
                  onModelTested={(
                    modelId: string,
                    result: ModelTestResult,
                    allResults?: Record<string, ModelTestResult>,
                  ) => {
                    // 创建更新后的模型列表，确保保留所有已测试模型的状态
                    const updatedModels = models.map((model) => {
                      // 如果是当前测试的模型，更新其状态
                      if (model.id === modelId) {
                        return {
                          ...model,
                          tested: true,
                          available: result.success,
                          responseTime: result.responseTime || 0,
                          timeout: result.timeout || false,
                        };
                      }

                      // 如果提供了所有结果，并且当前模型在结果中，也更新其状态
                      if (allResults && allResults[model.id]) {
                        const modelResult = allResults[model.id];
                        return {
                          ...model,
                          tested: true,
                          available: modelResult.success,
                          responseTime: modelResult.responseTime || 0,
                          timeout: modelResult.timeout || false,
                        };
                      }

                      // 否则保持原状态
                      return model;
                    });

                    // 直接设置状态
                    setModels(updatedModels);

                    // 保存到本地存储
                    try {
                      localStorage.setItem(
                        MODELS_STORAGE_KEY,
                        JSON.stringify(updatedModels),
                      );
                    } catch (error) {
                      console.error(
                        Locale.Settings.Access.CustomModel
                          .UpdateStorageFailedError,
                        error,
                      );
                      showToast(
                        Locale.Settings.Access.CustomModel.TestErrorPrefix +
                          (error instanceof Error
                            ? error.message
                            : String(error)),
                      );
                    }
                  }}
                  onTimeoutChange={(value) => setTestTimeout(value)}
                  initialTimeout={testTimeout}
                  useServerTest={!accessStore.useCustomConfig}
                />
              </div>

              {/* 确认取消按钮 */}
              <div className={styles.buttonGroup}>
                <IconButton
                  key="cancel"
                  icon={<CancelIcon />}
                  bordered
                  text={Locale.UI.Cancel}
                  onClick={props.onClose}
                  className={styles.responsiveButton}
                />
                <IconButton
                  key="confirm"
                  icon={<ConfirmIcon />}
                  bordered
                  text={Locale.UI.Confirm}
                  onClick={handleConfirm}
                  className={styles.responsiveButton}
                />
              </div>
            </div>
          </div>,
        ]}
      >
        {loading ? (
          <div className={styles.modelSelectorLoading}>
            <LoadingIcon />
          </div>
        ) : (
          <>
            <List>
              {/* 过滤并显示模型列表 */}
              {filteredModels.map((model, index) => {
                // 获取在完整列表中的索引，用于编辑和删除操作
                const originalIndex = models.findIndex(
                  (m) => m.id === model.id,
                );
                const isEditing = editingIndex === originalIndex;

                // 获取模型类别
                const modelCategory = getModelCategory(model.id);

                // 根据类别构造头像标识符
                let avatarId = getFixedCategoryAvatar(modelCategory);

                return (
                  <ListItem
                    key={model.id}
                    title=""
                    icon={avatarId}
                    onClick={undefined}
                    className={
                      model.tested && !model.available
                        ? styles.modelUnavailable
                        : ""
                    }
                  >
                    {model.isCustom && isEditing ? (
                      <div className={styles.modelSelectorEditForm}>
                        <div className={styles.modelSelectorEditFormRow}>
                          <span
                            className={styles.modelSelectorEditFormRowLabel}
                          >
                            {Locale.Settings.Access.CustomModel.ModelNameLabel}:
                          </span>
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className={styles.modelSelectorEditFormRowInput}
                            autoFocus
                          />
                        </div>
                        <div className={styles.modelSelectorEditFormButtons}>
                          <IconButton
                            icon={<ConfirmIcon />}
                            onClick={() => {
                              // 保存编辑的模型名称
                              const updatedModels = [...models];
                              updatedModels[originalIndex] = {
                                ...updatedModels[originalIndex],
                                id: editingValue,
                              };
                              setModels(updatedModels);

                              // 更新本地存储
                              try {
                                localStorage.setItem(
                                  MODELS_STORAGE_KEY,
                                  JSON.stringify(updatedModels),
                                );
                              } catch (error) {
                                console.error(
                                  Locale.Settings.Access.CustomModel
                                    .SaveEditFailed,
                                  error,
                                );
                              }

                              setEditingIndex(null);
                            }}
                            style={{ padding: "8px" }}
                          />
                          <IconButton
                            icon={<CancelIcon />}
                            onClick={() => setEditingIndex(null)}
                            style={{ padding: "8px" }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span className={styles.modelSelectorModelName}>
                          {model.id}
                        </span>
                        <span
                          className={
                            model.tested
                              ? styles.modelResponseTime +
                                " " +
                                (model.available
                                  ? getResponseTimeClass(
                                      model.responseTime || 0,
                                    )
                                  : model.timeout
                                  ? styles.modelTimeout
                                  : styles.modelUnavailable)
                              : styles.modelTestButton
                          }
                          onClick={(e) => {
                            e.stopPropagation(); // 阻止事件冒泡
                            testSingleModel(model.id);
                          }}
                          style={{ cursor: "pointer" }}
                          title={
                            model.tested
                              ? Locale.Settings.Access.CustomModel
                                  .RetestButtonTooltip
                              : Locale.Settings.Access.CustomModel
                                  .TestButtonTooltip
                          }
                        >
                          {model.tested
                            ? model.available
                              ? `${((model.responseTime || 0) / 1000).toFixed(
                                  2,
                                )}s`
                              : model.timeout
                              ? Locale.Settings.Access.CustomModel.TestTimeout
                              : Locale.Settings.Access.CustomModel
                                  .TestUnavailable
                            : Locale.Settings.Access.CustomModel.TestButton}
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center" }}>
                      {model.isCustom && !isEditing && (
                        <>
                          <IconButton
                            icon={<EditIcon />}
                            onClick={() => startEditing(index)}
                            style={{
                              marginRight: "8px",
                              padding: "8px",
                            }}
                          />
                          <IconButton
                            icon={<CloseIcon />}
                            onClick={() => deleteCustomModel(index)}
                            style={{
                              marginRight: "8px",
                              padding: "8px",
                            }}
                          />
                        </>
                      )}
                      <input
                        type="checkbox"
                        checked={model.selected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleModelSelection(originalIndex);
                        }}
                      />
                    </div>
                  </ListItem>
                );
              })}

              {/* 修改添加新模型的输入行 */}
              <ListItem key="new-model-input" icon={undefined} title="">
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addCustomModel();
                      }
                    }}
                    placeholder={
                      Locale.Settings.Access.CustomModel
                        .InputPlaceholderEnter ||
                      "输入自定义模型名称并按回车添加"
                    }
                    className={styles.modelSelectorCustomInput}
                  />
                </div>
              </ListItem>
            </List>
          </>
        )}
      </Modal>

      {/* 添加类别编辑器模态框 */}
      {showCategoryEditor && (
        <div className="modal-mask">
          <Modal
            title={
              Locale.Settings.Access.CustomModel.EditCategories ||
              "编辑模型类别"
            }
            onClose={() => setShowCategoryEditor(false)}
            actions={[
              <IconButton
                key="reset"
                icon={<ResetIcon />}
                text={Locale.Settings.Access.CustomModel.RestoreDefaults}
                onClick={resetToDefaultPatterns}
                bordered
              />,
              <IconButton
                key="close"
                icon={<ConfirmIcon />}
                text={Locale.UI.Close}
                onClick={() => setShowCategoryEditor(false)}
                bordered
              />,
            ]}
          >
            <div className={styles.modelSelectorCategoryEditor}>
              {/* 显示所有类别（按字母顺序排序） */}
              <List>
                {Object.entries(systemCategoryPatterns)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([category, pattern], index) => {
                    const isEditing = editingIndex === -index - 1;

                    return (
                      <ListItem
                        key={category}
                        title={isEditing ? "" : category}
                        subTitle={
                          isEditing
                            ? ""
                            : `${Locale.Settings.Access.CustomModel.MatchPrefix}: ${pattern}`
                        }
                        icon={getFixedCategoryAvatar(category)}
                      >
                        {isEditing ? (
                          <div className={styles.categoryEditForm}>
                            <div className={styles.categoryEditFormRow}>
                              <span
                                className={styles.modelSelectorEditFormRowLabel}
                              >
                                {Locale.Settings.Access.CustomModel.MatchRule}:
                              </span>
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) =>
                                  setEditingValue(e.target.value)
                                }
                                className={styles.modelSelectorEditFormRowInput}
                                autoFocus
                              />
                            </div>
                            <div className={styles.categoryEditFormButtons}>
                              <IconButton
                                icon={<ConfirmIcon />}
                                onClick={() =>
                                  saveSystemCategoryPattern(
                                    category,
                                    editingValue,
                                  )
                                }
                                style={{ padding: "8px" }}
                              />
                              <IconButton
                                icon={<CancelIcon />}
                                onClick={() => setEditingIndex(null)}
                                style={{ padding: "8px" }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <IconButton
                              icon={<EditIcon />}
                              onClick={() => {
                                setEditingIndex(-index - 1);
                                setEditingValue(pattern);
                              }}
                              style={{ padding: "8px" }}
                            />
                          </div>
                        )}
                      </ListItem>
                    );
                  })}
              </List>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
