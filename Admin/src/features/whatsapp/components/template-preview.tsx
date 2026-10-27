import type { ReactNode } from "react";
import { ExternalLink, FileText, ImageIcon, Phone, Reply, Video } from "lucide-react";
import type { HeaderType, TemplateButton } from "@/features/whatsapp/hooks";

type Field = { value: string; label: string; sample: string };

/** WhatsApp's own inline formatting, plus any {{n}} still unmapped. */
const TOKEN = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|\{\{\d+\}\})/g;

function formatText(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (/^\{\{\d+\}\}$/.test(part)) {
      return <span key={i} className="rounded bg-amber-200/80 px-1 font-mono text-[0.8em] text-amber-900">{part}</span>;
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (part.length > 2 && part.startsWith("_") && part.endsWith("_")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.length > 2 && part.startsWith("~") && part.endsWith("~")) return <s key={i}>{part.slice(1, -1)}</s>;
    return part;
  });
}

const BUTTON_ICON = { QUICK_REPLY: Reply, URL: ExternalLink, PHONE_NUMBER: Phone } as const;

/**
 * How the message will look on the customer's phone, filled with each mapped
 * field's sample value (the same samples Meta's reviewers are sent).
 */
export function TemplatePreview({
  headerType, headerText, mediaUrl, mediaFilename, body, footer, buttons, variableMap, fields,
}: {
  headerType: HeaderType;
  headerText: string;
  mediaUrl?: string | null | undefined;
  mediaFilename?: string | undefined;
  body: string;
  footer: string;
  buttons: TemplateButton[];
  variableMap: Record<string, string>;
  fields: Field[];
}) {
  const samples = Object.fromEntries(fields.map((f) => [f.value, f.sample || `[${f.label}]`]));
  const filled = body.replace(/\{\{(\d+)\}\}/g, (match, key: string) => {
    const field = variableMap[key];
    return field && samples[field] ? samples[field] : match;
  });
  const unmapped = [...new Set([...filled.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[0]))];
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl bg-[#efeae2] p-3">
        <div className="max-w-[95%] overflow-hidden rounded-lg rounded-tl-none bg-white text-[0.9rem] leading-snug text-[#111b21] shadow-sm">
          {headerType === "image" && (
            mediaUrl ? (
              <img src={mediaUrl} alt="" className="block max-h-56 w-full object-cover p-1 pb-0" />
            ) : (
              <div className="m-1 mb-0 flex h-36 flex-col items-center justify-center gap-1 rounded-md bg-[#dfe5e7] text-xs text-[#54656f]">
                <ImageIcon className="size-7" /> Image header
              </div>
            )
          )}
          {headerType === "video" && (
            <div className="m-1 mb-0 flex h-36 flex-col items-center justify-center gap-1 rounded-md bg-[#dfe5e7] text-xs text-[#54656f]">
              <Video className="size-7" /> {mediaFilename || "Video header"}
            </div>
          )}
          {headerType === "document" && (
            <div className="m-1 mb-0 flex items-center gap-2 rounded-md bg-[#f5f6f6] px-3 py-2.5 text-xs text-[#54656f]">
              <FileText className="size-6 shrink-0 text-red-500" />
              <span className="truncate">{mediaFilename || "Document.pdf"}</span>
            </div>
          )}
          <div className="px-2.5 pt-1.5 pb-1">
            {headerType === "text" && headerText && <p className="mb-1 font-bold">{headerText}</p>}
            <p className="whitespace-pre-wrap break-words">
              {body.trim() ? formatText(filled) : <span className="text-[#667781]">Your message preview appears here.</span>}
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <span className="text-xs text-[#667781]">{footer}</span>
              <span className="shrink-0 text-[0.68rem] text-[#667781]">{time}</span>
            </div>
          </div>
          {buttons.length > 0 && (
            <div className="border-t border-[#e9edef]">
              {buttons.map((button, i) => {
                const Icon = BUTTON_ICON[button.type];
                return (
                  <div key={i} className="flex items-center justify-center gap-1.5 border-b border-[#e9edef] py-2 text-sm font-medium text-[#027eb5] last:border-b-0">
                    <Icon className="size-4" /> {button.text || "Button"}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {unmapped.length > 0
          ? `Map ${unmapped.join(", ")} to a field under "Send on this event" to fill ${unmapped.length === 1 ? "it" : "them"} in.`
          : "Sample values shown. Each real message uses that record's details."}
      </p>
    </div>
  );
}
