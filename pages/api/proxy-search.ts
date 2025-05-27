import { NextApiRequest, NextApiResponse } from 'next';

/**
 * 代理搜索请求，解决跨域问题
 * 
 * @param req 请求对象
 * @param res 响应对象
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 获取要请求的URL
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }
  
  try {
    // 发送请求到目标 URL
    console.log('Sending request to:', url);
    const response = await fetch(url);
    
    // 如果响应不成功，返回错误
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Target server responded with status: ${response.status}`,
        status: response.status,
        statusText: response.statusText
      });
    }
    
    // 获取响应内容类型
    const contentType = response.headers.get('content-type');
    
    // 获取响应内容
    const data = await response.json();
    
    // 设置适当的内容类型头
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // 返回响应数据
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch from target URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 