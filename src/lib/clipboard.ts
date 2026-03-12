/**
 * 클립보드 복사 유틸
 * - HTTPS 환경: navigator.clipboard API 사용
 * - HTTP 환경 (로컬 네트워크): document.execCommand 폴백
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // HTTPS가 아닌 환경에서 실패 → 폴백으로 진행
    }
  }
  // execCommand 폴백 (구형 환경 / HTTP 로컬 네트워크)
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
