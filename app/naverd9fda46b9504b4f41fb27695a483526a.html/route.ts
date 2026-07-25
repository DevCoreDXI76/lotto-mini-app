export async function GET() {
  return new Response(
    'naver-site-verification: naverd9fda46b9504b4f41fb27695a483526a.html',
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  );
}
