import Image from "next/image";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getTitleInitials } from "@/lib/sanity-blog";

type BlogArchiveMediaProps = {
  title: string;
  imageUrl: string | null;
  imageAlt: string;
};

export const BlogArchiveMedia = ({
  title,
  imageUrl,
  imageAlt,
}: BlogArchiveMediaProps) => {
  const initials = getTitleInitials(title);

  if (imageUrl) {
    return (
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-blog-cream-deep sm:h-20 sm:w-28">
        <Image
          src={imageUrl}
          alt={imageAlt || title}
          fill
          sizes="112px"
          className="object-cover object-center"
        />
      </div>
    );
  }

  return (
    <Avatar className="h-16 w-16 rounded-lg sm:h-20 sm:w-20">
      <AvatarFallback className="rounded-lg bg-blog-sage-soft text-base text-blog-ink sm:text-lg">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
