import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Same vertical position as the floating controls on Home (just under the header),
// so toasts are no longer hidden behind the status bar / Dynamic Island.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      offset={{ top: "max(4.5rem, calc(env(safe-area-inset-top) + 3.75rem))" }}
      mobileOffset={{ top: "max(4.5rem, calc(env(safe-area-inset-top) + 3.75rem))" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-2xl !border !border-hairline !bg-surface !text-ink !shadow-lifted !px-4 !py-3.5 !gap-3 !text-[14px] !font-medium data-[type=error]:!border-destructive/40 data-[type=success]:!border-accent/40",
          title: "!text-[14px] !font-semibold !text-ink",
          description: "group-[.toast]:!text-[13px] group-[.toast]:!text-ink-soft",
          icon: "data-[type=success]:!text-accent data-[type=error]:!text-destructive",
          actionButton:
            "group-[.toast]:!bg-accent group-[.toast]:!text-accent-foreground group-[.toast]:!rounded-xl",
          cancelButton: "group-[.toast]:!bg-surface-muted group-[.toast]:!text-ink-soft",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
