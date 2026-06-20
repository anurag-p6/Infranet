export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="code-block">
      <code>{children}</code>
    </pre>
  );
}
