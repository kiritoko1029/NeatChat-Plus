import { NextApiRequest, NextApiResponse } from 'next';

/**
 * 使用SearXNG进行网络搜索
 * 
 * @param req 请求对象
 * @param res 响应对象
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 获取查询参数
  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing search query parameter' });
  }
  
  try {
    // 获取SearXNG URL
    const searxngUrl = process.env.SEARXNG_URL;
    
    if (!searxngUrl) {
      // 如果未配置SearXNG URL，使用模拟数据（用于开发测试）
      return res.status(200).json({
        results: [
          {
            title: "模拟搜索结果 1",
            snippet: "这是一个模拟的搜索结果描述。由于未配置SearXNG URL，系统返回了模拟数据。",
            link: "https://example.com/result1"
          },
          {
            title: "模拟搜索结果 2",
            snippet: "这是另一个模拟的搜索结果。这些结果仅用于测试目的，实际部署时需配置SEARXNG_URL环境变量。",
            link: "https://example.com/result2"
          },
          {
            title: "关于SearXNG配置",
            snippet: "要启用真实搜索功能，请在环境变量中设置SEARXNG_URL，指向您的SearXNG实例地址。",
            link: "https://github.com/searxng/searxng"
          }
        ]
      });
    }
    
    // 构建SearXNG搜索URL
    const searchUrl = `${searxngUrl}/search?q=${encodeURIComponent(q)}&format=json&language=zh`;
    console.log("使用SearXNG搜索URL:", searchUrl);
    
    // 发送请求
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`SearXNG API responded with status: ${response.status}`);
    }
    
    // 解析结果
    const data = await response.json();
    
    // 格式化结果 - SearXNG返回的结果结构与Google不同
    const results = data.results?.slice(0, 10).map((item: any) => ({
      title: item.title,
      snippet: item.content || item.snippet || "",
      link: item.url
    })) || [];
    
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({ 
      error: 'Failed to perform search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 