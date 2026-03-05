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
      "group flex w-full items-start gap-3 py-3 px-[3px]",
      from === "user" ? "is-user justify-end" : "is-assistant justify-start",
      className
    )}
    {...props}
  />
);

const messageContentVariants = cva(
  "flex flex-col gap-2 overflow-hidden text-sm max-w-full",
  {
    variants: {
      variant: {
        contained: [
          "group-[.is-user]:max-w-[96%] group-[.is-user]:rounded-lg group-[.is-user]:border group-[.is-user]:border-gray-200 group-[.is-user]:bg-gray-50 group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-gray-900 lg:group-[.is-user]:max-w-[46rem]",
          "group-[.is-assistant]:max-w-[96%] group-[.is-assistant]:text-gray-900 lg:group-[.is-assistant]:max-w-[46rem]",
        ],
        flat: [
          "group-[.is-user]:max-w-[96%] group-[.is-user]:rounded-lg group-[.is-user]:border group-[.is-user]:border-gray-200 group-[.is-user]:bg-gray-50 group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-gray-900 lg:group-[.is-user]:max-w-[46rem]",
          "group-[.is-assistant]:max-w-[96%] group-[.is-assistant]:text-gray-900 lg:group-[.is-assistant]:max-w-[46rem]",
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
