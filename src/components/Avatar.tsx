import type { Subscription } from "../lib/useSubscriptions.ts";

type Props = { subscription: Pick<Subscription, "screen_name" | "avatar_url">; className: string };

/** Profile picture, or a lettered placeholder for an account the pipeline has not fetched yet. */
export function Avatar({ subscription, className }: Props) {
  if (subscription.avatar_url === "") {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-600 ${className}`}
      >
        {subscription.screen_name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={subscription.avatar_url}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 ${className}`}
    />
  );
}
