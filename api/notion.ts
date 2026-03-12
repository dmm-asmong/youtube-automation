// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  const titleProp = process.env.NOTION_TITLE_PROP ?? '이름';

  if (!token || !databaseId) {
    return res.status(500).json({ error: 'Notion 환경변수가 설정되지 않았습니다.' });
  }

  const { title, blocks } = req.body;

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
  return res.status(notionRes.status).json(data);
}
