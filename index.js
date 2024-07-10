/**
 * Cloudflare Workers entry point
 */
addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method === "POST") {
    return event.respondWith(WriteFile(request));
  } else if (request.method === "GET") {
    return event.respondWith(ReadFile(request));
  } else {
    return fetch("https://http.cat/500");
  }
});

/**
 * Get file extension from pathname
 * @param {string} pathname
 * @returns {string}
 */
function getFileExtension(pathname) {
  const parts = pathname.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Get content type based on file extension
 * @param {string} extension
 * @returns {string}
 */
function getContentType(extension) {
  switch (extension) {
    case 'json':
      return 'application/json';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Read file from KV storage
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function ReadFile(request) {
  const { pathname } = new URL(request.url);
  const extension = getFileExtension(pathname);
  const contentType = getContentType(extension);

  const value = await FILEBASE.get(pathname, 'arrayBuffer');
  if (value === null) {
    return fetch("https://http.cat/404");
  }

  return new Response(value, {
    headers: { "Content-Type": contentType },
  });
}

/**
 * Write file to KV storage
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function WriteFile(request) {
  const { pathname } = new URL(request.url);
  const contentType = request.headers.get("Content-Type") || "application/octet-stream";

  let body;
  if (contentType === "application/json") {
    // For JSON, we parse and stringify to ensure valid JSON
    const json = await request.json();
    body = JSON.stringify(json);
  } else {
    // For other types, we store as ArrayBuffer
    body = await request.arrayBuffer();
  }

  await FILEBASE.put(pathname, body, {
    metadata: { contentType: contentType }
  });

  return new Response(JSON.stringify({ success: true, contentType: contentType }), {
    headers: { "Content-Type": "application/json" },
  });
}
