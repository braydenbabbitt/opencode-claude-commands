export const convertPlaceholders = (template: string): string => {
  let result = template;

  // Convert $ARGUMENTS[N] to $(N+1) positional args (0-based -> 1-based)
  result = result.replace(/\$ARGUMENTS\[(\d+)\]/g, (_match, index) => {
    const openCodeIndex = parseInt(index, 10) + 1;
    return `$${openCodeIndex}`;
  });

  // Convert bare $N positional args (0-based -> 1-based)
  // Must not match $ARGUMENTS or already-converted refs.
  // Match $0, $1, ... but not $ARGUMENTS, ${...}, or $N preceded by [
  result = result.replace(/(?<!\[)\$(\d+)(?!\])/g, (_match, index) => {
    const openCodeIndex = parseInt(index, 10) + 1;
    return `$${openCodeIndex}`;
  });

  // Convert ```! multi-line shell blocks to individual !`cmd` lines
  result = result.replace(
    /```!\s*\n([\s\S]*?)```/g,
    (_match, blockContent: string) => {
      return blockContent
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => "!`" + line + "`")
        .join("\n");
    },
  );

  return result;
};
