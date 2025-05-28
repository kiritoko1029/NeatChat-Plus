import { NextApiRequest, NextApiResponse } from 'next';

/**
 * 获取环境变量配置状态
 * 
 * @param req 请求对象
 * @param res 响应对象
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 返回环境变量配置状态（不返回敏感信息的完整值）
    const envConfig = {
      searxngUrl: process.env.SEARXNG_URL || null,
    };

    return res.status(200).json(envConfig);
  } catch (error) {
    console.error('获取环境配置失败:', error);
    return res.status(500).json({ 
      error: 'Failed to get environment config',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 