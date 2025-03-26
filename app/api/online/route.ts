import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "../../config/server";

// 存储所有在线用户的连接ID和最后活动时间
// 使用浏览器指纹作为key
const onlineUsers = new Map<string, { lastActive: number; clientId: string }>();
// 清理超时用户的定时器
let cleanupInterval: NodeJS.Timeout | null = null;

// 清理5分钟内无活动的用户
const TIMEOUT_MS = 5 * 60 * 1000;

// 启动定时清理
function startCleanupInterval() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, data] of onlineUsers.entries()) {
      if (now - data.lastActive > TIMEOUT_MS) {
        onlineUsers.delete(id);
      }
    }
  }, 60 * 1000); // 每分钟检查一次
}

export async function GET(req: NextRequest) {
  const serverConfig = getServerSideConfig();

  // 如果未启用在线人数统计功能，返回空结果
  if (!serverConfig.enableOnlineMember) {
    return NextResponse.json({ count: 0, enabled: false });
  }

  // 确保清理定时器已启动
  startCleanupInterval();

  // 获取查询参数
  const { searchParams } = new URL(req.url);
  let clientId = searchParams.get("clientId") || "";
  // 使用客户端提供的浏览器指纹
  const fingerprint = searchParams.get("fingerprint") || "";

  // 如果没有指纹，返回错误
  if (!fingerprint) {
    return NextResponse.json({
      error: "Browser fingerprint is required",
      count: onlineUsers.size,
      enabled: true,
    });
  }

  // 如果已经有这个指纹的记录，使用已存在的clientId
  if (onlineUsers.has(fingerprint)) {
    clientId = onlineUsers.get(fingerprint)!.clientId;
  }
  // 如果没有客户端ID，生成一个新的
  else if (!clientId) {
    clientId = Math.random().toString(36).substring(2, 15);
  }

  // 更新或添加用户活动状态
  onlineUsers.set(fingerprint, {
    lastActive: Date.now(),
    clientId,
  });

  // 返回当前在线人数和客户端ID
  return NextResponse.json({
    count: onlineUsers.size,
    clientId,
    enabled: true,
  });
}

export const runtime = "edge";
