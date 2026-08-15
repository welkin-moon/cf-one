import uxRuntime from './ux-runtime.js';

function stripInternalIntroCopy(html) {
  return html
    .replace(
      /<p class="muted">v3\.1 将性别方向、浪漫吸引、身体\/性吸引和关系互动分开计分。[\s\S]*?<\/p>/,
      ''
    )
    .replace(
      /<div class="note tiny">本版本含身体\/性吸引题，[\s\S]*?<\/div>/,
      ''
    );
}

async function present(request, env, ctx) {
  const response = await uxRuntime.fetch(request, env, ctx);
  if (request.method !== 'GET') return response;

  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  const url = new URL(request.url);
  if (url.pathname !== '/') return response;

  const original = await response.text();
  const body = stripInternalIntroCopy(original);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  fetch(request, env, ctx) {
    return present(request, env, ctx);
  }
};
