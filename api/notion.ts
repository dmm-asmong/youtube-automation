export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  const titleProp = process.env.NOTION_TITLE_PROP ?? '이름';

  if (!token || !databaseId) {
    return new Response(JSON.stringify({ error: 'Notion 환경변수가 설정되지 않았습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { title, blocks } = await req.json();

  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        [titleProp]: { title: [{ text: { content: title } }] },
      },
      children: blocks,
    }),
  });

  const data = await notionRes.json();
  return new Response(JSON.stringify(data), {
    status: notionRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
