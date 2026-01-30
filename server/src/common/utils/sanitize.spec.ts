import { escapeHtml } from './sanitize';

describe('escapeHtml', () => {
  it('HTML 태그를 이스케이프 처리한다', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('이미지 태그 XSS를 이스케이프 처리한다', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
  });

  it('한국어 문자는 변경하지 않는다', () => {
    expect(escapeHtml('다빈치님')).toBe('다빈치님');
  });

  it('일반 텍스트는 변경하지 않는다', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });

  it('앰퍼샌드를 이스케이프한다', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('작은따옴표를 이스케이프한다', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('큰따옴표를 이스케이프한다', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('모든 특수문자가 포함된 문자열을 처리한다', () => {
    expect(escapeHtml('<div class="test">&\'end</div>')).toBe(
      '&lt;div class=&quot;test&quot;&gt;&amp;&#39;end&lt;/div&gt;',
    );
  });
});
