import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, HTMLAttributes } from "react";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full items-start gap-3 py-3",
      from === "user" ? "is-user justify-end" : "is-assistant justify-start",
      className
    )}
    {...props}
  />
);

const messageContentVariants = cva(
  "flex flex-col gap-2 overflow-hidden text-sm",
  {
    variants: {
      variant: {
        contained: [
          "group-[.is-user]:max-w-[75%] group-[.is-user]:rounded-lg group-[.is-user]:bg-gray-900 group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-white",
          "group-[.is-assistant]:max-w-[75%] group-[.is-assistant]:rounded-lg group-[.is-assistant]:border group-[.is-assistant]:border-gray-200 group-[.is-assistant]:bg-gray-50 group-[.is-assistant]:px-4 group-[.is-assistant]:py-3 group-[.is-assistant]:text-gray-900",
        ],
        flat: [
          "group-[.is-user]:max-w-[75%] group-[.is-user]:rounded-lg group-[.is-user]:border group-[.is-user]:border-gray-200 group-[.is-user]:bg-white group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-gray-900",
          "group-[.is-assistant]:max-w-[75%] group-[.is-assistant]:rounded-lg group-[.is-assistant]:px-4 group-[.is-assistant]:py-3 group-[.is-assistant]:text-gray-900",
        ],
      },
    },
    defaultVariants: {
      variant: "contained",
    },
  }
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof messageContentVariants>;

export const MessageContent = ({
  children,
  className,
  variant,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(messageContentVariants({ variant, className }))}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn("size-8 border border-gray-200", className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || "ME"}</AvatarFallback>
  </Avatar>
);
