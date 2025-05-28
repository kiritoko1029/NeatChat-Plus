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
  const { q, maxResults, searxngUrl } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing search query parameter' });
  }

  // 解析最大结果数量，默认为5，最大为20
  const maxResultsNum = Math.min(20, Math.max(1, parseInt(maxResults as string) || 5));
  
  try {
    // 获取SearXNG URL - 优先使用用户配置的URL，然后是环境变量
    const finalSearxngUrl = (searxngUrl as string) || process.env.SEARXNG_URL;
    
    if (!finalSearxngUrl) {
      // 如果未配置SearXNG URL，返回配置提示
      return res.status(200).json({
        results: [
          {
            title: "⚠️ 网络搜索功能未配置",
            snippet: "要使用网络搜索功能，请配置SearXNG服务地址。您可以：\n1. 在网络搜索配置中设置自定义SearXNG URL\n2. 或在环境变量中设置 SEARXNG_URL",
            link: "https://github.com/searxng/searxng"
          },
          {
            title: "🔧 如何配置SearXNG",
            snippet: "SearXNG是一个免费的开源搜索引擎聚合器。您可以：\n• 使用公共实例（如 https://searx.be）\n• 自建SearXNG实例\n• 使用Docker快速部署",
            link: "https://docs.searxng.org/"
          },
          {
            title: "🌐 公共SearXNG实例",
            snippet: "您可以使用以下公共实例之一：\n• https://searx.be\n• https://search.sapti.me\n• https://searx.tiekoetter.com\n注意：公共实例可能有使用限制",
            link: "https://searx.space/"
          }
        ]
      });
    }
    
    // 构建SearXNG搜索URL
    const searchUrl = `${finalSearxngUrl}/search?q=${encodeURIComponent(q)}&format=json&language=zh`;
    console.log("使用SearXNG搜索URL:", searchUrl);
    
    // 发送请求
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`SearXNG API responded with status: ${response.status}`);
    }
    
    // 解析结果
    const data = await response.json();
    
    // 格式化结果 - SearXNG返回的结果结构与Google不同
    const results = data.results?.slice(0, maxResultsNum).map((item: any) => ({
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