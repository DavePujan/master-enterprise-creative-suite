import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("Missing url parameter");
  
  try {
    // Clean target URL and ensure it's valid
    const sanitizedUrl = targetUrl.trim();
    
    let urlObj: URL;
    try {
      urlObj = new URL(sanitizedUrl);
    } catch (e) {
      return res.status(400).send(`Invalid URL provided: ${sanitizedUrl}`);
    }

    console.log(`Proxying request to: ${sanitizedUrl}`);
    const fetchResponse = await fetch(sanitizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': urlObj.origin,
        'Accept': '*/*'
      }
    });
    
    if (!fetchResponse.ok) {
      console.error(`Fetch failed with status: ${fetchResponse.status} ${fetchResponse.statusText}`);
      return res.status(fetchResponse.status).send(`Failed to fetch from target: ${fetchResponse.statusText}`);
    }
    
    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const contentType = fetchResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
      // Force attachment for common types based on URL path or type
      const urlWithoutParams = targetUrl.split('?')[0];
      if (urlWithoutParams.toLowerCase().endsWith('.md') || 
          urlWithoutParams.toLowerCase().endsWith('.txt') ||
          contentType.includes('markdown') ||
          contentType.includes('text/plain')) {
         res.setHeader('Content-Disposition', 'attachment');
      }
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
    res.send(buffer);
  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(500).send(`Proxy internal error: ${error.message}`);
  }
}
