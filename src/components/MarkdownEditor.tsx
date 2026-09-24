import { useRef, useState } from "react";
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link,
  List,
  Quote,
} from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  autoFocus?: boolean;
  rows?: number;
  className?: string;
  textareaClassName?: string;
}

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, onClick, children }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  id,
  placeholder,
  autoFocus,
  rows,
  className,
  textareaClassName,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState("write");

  const applyWrap = (before: string, after: string = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const applyLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => {
      el.focus();
      const next = start + prefix.length;
      el.setSelectionRange(next, next);
    });
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-0.5">
          {tab === "write" && (
            <>
              <ToolbarButton label="Bold" onClick={() => applyWrap("**")}>
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="Italic" onClick={() => applyWrap("*")}>
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="Heading" onClick={() => applyLinePrefix("## ")}>
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="Bullet list" onClick={() => applyLinePrefix("- ")}>
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="Quote" onClick={() => applyLinePrefix("> ")}>
                <Quote className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="Inline code" onClick={() => applyWrap("`")}>
                <Code className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="Link" onClick={() => applyWrap("[", "](url)")}>
                <Link className="h-4 w-4" />
              </ToolbarButton>
            </>
          )}
        </div>
        <TabsList className="h-8 shrink-0">
          <TabsTrigger value="write" className="px-3 py-1">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-3 py-1">
            Preview
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="write" className="mt-2 flex flex-1 flex-col">
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={rows}
          className={cn("font-mono", textareaClassName)}
        />
      </TabsContent>

      <TabsContent
        value="preview"
        className="mt-2 min-h-[80px] flex-1 overflow-auto rounded-md border border-input bg-background p-3"
      >
        {value.trim() ? (
          <Markdown content={value} />
        ) : (
          <p className="text-sm text-muted-foreground">Nothing to preview.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
